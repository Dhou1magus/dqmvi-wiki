/**
 * 一覧の表の見出しを押すと、その列で並べ替えできるようにする。
 *
 * このwikiは markdown.html: false（本文に生のHTMLを書けない）ので、
 * 表にclassを付けて目印にはできない。かわりに
 * 一覧ページ（frontmatter の pageClass: wide-page）の中の表のうち、
 *   ・先頭の見出しが「No.」のもの（モンスター図鑑など）か、
 *   ・pageClass に sortable-list も書いてあるページの表
 * だけを対象にする。説明用の短い表（呪文の「読み方」など）には手を出さない。
 * ★生成側の見出しを変えるときは SORTABLE_FIRST_HEADER も直すこと。
 *
 * VitePressはページを切り替えても読み込み直さないので、
 * theme/index.ts から遷移のたびに setupSortableTables() を呼ぶ。
 */

/** 「10,000」のような桁区切りつきの文字を数値にする。数値でなければ null */
function toNumber(text: string): number | null {
  const t = text.replace(/,/g, '').trim()
  if (!t || !/^-?\d+(\.\d+)?$/.test(t)) return null
  return Number(t)
}

/** その列が数値の列かどうかを、実際の中身を何行か見て決める */
function isNumericColumn(rows: HTMLTableRowElement[], index: number): boolean {
  let checked = 0
  for (const row of rows) {
    const text = row.cells[index]?.textContent?.trim()
    if (!text || text === '—') continue // 空欄は判定に使わない
    if (toNumber(text) === null) return false
    if (++checked >= 20) break
  }
  return checked > 0
}

/** この見出しで始まる表だけを並べ替えの対象にする。生成側の見出しと合わせること */
const SORTABLE_FIRST_HEADER = 'No.'

/**
 * 折り返しを止める列の、中身の長さの上限（文字数）。
 * モンスター名や職業名・ランクのような短い列は途中で改行させたくないが、
 * 効果の説明文のような長い列まで一行にすると、表が横に伸びてしまう。
 * そこで列ごとに、いちばん長いセルがこの文字数以下なら折り返しを止める。
 * 名前の列（1列目。図鑑のように1列目が No. なら2列目）は長さに関係なく止める。
 * ★折り返す列が横に入りきらないと、スマホでは1文字ずつ改行されて縦に細長くなる
 *   （2026-09-03 指摘）。折り返す列は custom.css の word-break: keep-all で
 *   「、」「・」のような区切りでだけ折り返すようにしてある。
 */
const NOWRAP_MAX_LENGTH = 20

/**
 * 横にはみ出す表では、名前の列を左に固定して横スクロールしても見えるようにする。
 * 固定する列が表の見えている幅のこの割合より広いと、残りが見えなくなるので固定しない
 * （スマホの図鑑で名前の列は 58% ほど。アイテム一覧の30文字の品名は超えるので固定しない）。
 */
const STICKY_MAX_RATIO = 0.7

const collator = new Intl.Collator('ja')

/** 元の並び（図鑑ナンバー順）。同じ値が並んだときの順番をここで固定する */
const originalIndex = new WeakMap<HTMLTableRowElement, number>()

function sortRows(
  tbody: HTMLTableSectionElement,
  headers: HTMLTableCellElement[],
  index: number,
  direction: 'asc' | 'desc',
  numeric: boolean
): void {
  const sign = direction === 'asc' ? 1 : -1
  const rows = [...tbody.rows]

  rows.sort((a, b) => {
    const ta = a.cells[index]?.textContent?.trim() ?? ''
    const tb = b.cells[index]?.textContent?.trim() ?? ''

    if (numeric) {
      const na = toNumber(ta)
      const nb = toNumber(tb)
      // 値のない行は、昇順でも降順でもいつも末尾に置く
      if (na === null && nb !== null) return 1
      if (nb === null && na !== null) return -1
      if (na !== null && nb !== null && na !== nb) return (na - nb) * sign
    } else if (ta !== tb) {
      return collator.compare(ta, tb) * sign
    }
    // 同じ値なら元の並び（図鑑ナンバー順）を保つ
    return (originalIndex.get(a) ?? 0) - (originalIndex.get(b) ?? 0)
  })

  // 一行ずつ入れ替えると重いので、まとめて差し替える
  const fragment = document.createDocumentFragment()
  for (const row of rows) fragment.appendChild(row)
  tbody.appendChild(fragment)

  headers.forEach((th, i) => {
    th.setAttribute('aria-sort', i !== index ? 'none' : direction === 'asc' ? 'ascending' : 'descending')
  })
}

/** 名前の列の位置。図鑑のように1列目が No. なら2列目 */
function nameColumnOf(headers: HTMLTableCellElement[]): number {
  return headers[0]?.textContent?.trim() === SORTABLE_FIRST_HEADER ? 1 : 0
}

/** 名前の列と、短い内容の列に「折り返さない」印をつける */
function markNoWrapColumns(table: HTMLTableElement): void {
  const rows = [...(table.tBodies[0]?.rows ?? [])]
  const headers = [...(table.tHead?.rows[0]?.cells ?? [])]
  if (!rows.length || !headers.length) return
  const nameCol = nameColumnOf(headers)

  headers.forEach((th, i) => {
    if (i !== nameCol) {
      let longest = th.textContent?.trim().length ?? 0
      for (const row of rows) {
        const text = row.cells[i]?.textContent?.trim() ?? ''
        if (text.length > longest) longest = text.length
        if (longest > NOWRAP_MAX_LENGTH) return // この列は折り返させる
      }
    }
    th.classList.add('nowrap')
    for (const row of rows) row.cells[i]?.classList.add('nowrap')
  })
}

/**
 * 横にはみ出す表で、名前の列を左端に固定する（図鑑では手前の No. 列が下にもぐる）。
 * 画面の幅が変わると要否が変わるので、resize のたびに付け直す。
 */
function markStickyColumns(table: HTMLTableElement): void {
  const rows = [...(table.tBodies[0]?.rows ?? [])]
  const headers = [...(table.tHead?.rows[0]?.cells ?? [])]
  if (!rows.length || !headers.length) return
  const nameCol = nameColumnOf(headers)
  const cells = [headers[nameCol], ...rows.map((r) => r.cells[nameCol])].filter(Boolean) as HTMLTableCellElement[]

  for (const c of cells) c.classList.remove('sticky-col')
  if (table.scrollWidth <= table.clientWidth + 1) return // はみ出していなければ固定しない
  if (headers[nameCol].getBoundingClientRect().width > table.clientWidth * STICKY_MAX_RATIO) return
  for (const c of cells) c.classList.add('sticky-col')
}

function refreshStickyColumns(): void {
  for (const t of document.querySelectorAll<HTMLTableElement>('.Layout.wide-page .vp-doc table[data-table-ready]')) {
    markStickyColumns(t)
  }
}

/** 画面の幅が変わったときと、Webフォントが読み込まれて幅が変わったときに付け直す */
let stickyResizeBound = false
function bindStickyResize(): void {
  if (stickyResizeBound) return
  stickyResizeBound = true
  let timer: ReturnType<typeof setTimeout> | undefined
  window.addEventListener('resize', () => {
    clearTimeout(timer)
    timer = setTimeout(refreshStickyColumns, 200)
  })
  document.fonts?.ready.then(refreshStickyColumns)
}

export function setupSortableTables(): void {
  const tables = document.querySelectorAll<HTMLTableElement>('.Layout.wide-page .vp-doc table')

  for (const table of tables) {
    if (table.dataset.tableReady === 'yes') continue // 二重に付けない
    table.dataset.tableReady = 'yes'

    const tbody = table.tBodies[0]
    const headers = [...(table.tHead?.rows[0]?.cells ?? [])] as HTMLTableCellElement[]
    if (!tbody || !headers.length) continue

    markNoWrapColumns(table)
    markStickyColumns(table)
    bindStickyResize()

    if (tbody.rows.length < 2) continue
    const optedIn = document.querySelector('.Layout.sortable-list') !== null
    if (!optedIn && headers[0].textContent?.trim() !== SORTABLE_FIRST_HEADER) continue
    table.dataset.sortable = 'ready'

    const rows = [...tbody.rows]
    rows.forEach((row, i) => originalIndex.set(row, i))
    const numericColumn = headers.map((_, i) => isNumericColumn(rows, i))

    headers.forEach((th, i) => {
      const label = th.textContent?.trim() ?? ''
      th.tabIndex = 0
      th.setAttribute('role', 'button')
      th.setAttribute('aria-sort', 'none')
      th.setAttribute('title', `${label}で並べ替え`)

      const toggle = () => {
        const current = th.getAttribute('aria-sort')
        // 最初の一押しは、数値の項目なら大きい順（強い順）、文字なら五十音順。
        // ただし先頭のNo.列だけは1から順（＝元の並びに戻る）にする。
        // もう一度押すと逆になる。
        const firstPress: 'asc' | 'desc' = i === 0 || !numericColumn[i] ? 'asc' : 'desc'
        const direction: 'asc' | 'desc' =
          current === 'ascending' ? 'desc'
          : current === 'descending' ? 'asc'
          : firstPress
        sortRows(tbody, headers, i, direction, numericColumn[i])
      }

      th.addEventListener('click', toggle)
      th.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        toggle()
      })
    })
  }
}
