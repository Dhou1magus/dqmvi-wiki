/**
 * 一覧の表の見出しを押すと、その列で並べ替えできるようにする。
 *
 * このwikiは markdown.html: false（本文に生のHTMLを書けない）ので、
 * 表にclassを付けて目印にはできない。かわりに
 *   ・一覧ページ（frontmatter の pageClass: wide-page）の中で
 *   ・先頭の見出しが「No.」の表
 * だけを対象にする。ボス一覧の「行動の読み方」のような短い表には手を出さない。
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

export function setupSortableTables(): void {
  const tables = document.querySelectorAll<HTMLTableElement>('.Layout.wide-page .vp-doc table')

  for (const table of tables) {
    if (table.dataset.sortable === 'ready') continue // 二重に付けない

    const tbody = table.tBodies[0]
    const headers = [...(table.tHead?.rows[0]?.cells ?? [])] as HTMLTableCellElement[]
    if (!tbody || !headers.length || tbody.rows.length < 2) continue
    if (headers[0].textContent?.trim() !== SORTABLE_FIRST_HEADER) continue
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
        // 最初の一押しは、数値なら大きい順・文字なら五十音順。もう一度押すと逆になる
        const direction: 'asc' | 'desc' =
          current === 'ascending' ? 'desc'
          : current === 'descending' ? 'asc'
          : numericColumn[i] ? 'desc' : 'asc'
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
