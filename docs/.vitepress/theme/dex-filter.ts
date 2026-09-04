/**
 * モンスター図鑑（frontmatter の pageClass に monster-dex があるページ）の表の上に、
 * 絞り込みボタンを出す。
 *
 *   ランク1 … ランク7 ／ 雑魚・転生・ボス・コインボス ／ すべて
 *
 * ランクの列は表にある。種類は scripts/data/monster-kinds.json（config.mts が
 * themeConfig.monsterKinds に載せる）で決め、そこに無いものが「雑魚」。
 * 押したボタンは光り、同じ組（ランク同士・種類同士）は「どれか」、組をまたぐと「両方」の条件になる。
 * 何も押していなければ全部出る。「すべて」で解除。
 *
 * 本文に HTML を書けない（markdown.html:false）ので、ボタンは表示側で作る。
 * VitePress はページを切り替えても読み込み直さないので、theme/index.ts から遷移のたびに呼ぶ。
 * 並べ替え（sortable-tables.ts）とは独立。行に付ける class dex-hide を custom.css が display:none にする。
 */
const RANKS = [1, 2, 3, 4, 5, 6, 7]
/** 種類ボタンの並び。「雑魚」は monster-kinds.json のどこにも無いもの */
const KINDS = ['雑魚', '転生', 'ボス', 'コインボス']
const HIDE_CLASS = 'dex-hide'

export type Kinds = Record<string, string[]>

/** 行のモンスターを、ページURLの末尾（id）と表示名で表す */
function identify(row: HTMLTableRowElement, nameCol: number): { id: string; name: string } {
  const cell = row.cells[nameCol]
  const href = cell?.querySelector('a')?.getAttribute('href') ?? ''
  const id = decodeURIComponent(href.split('#')[0].split('?')[0].replace(/\/$/, '').split('/').pop() ?? '')
  return { id, name: cell?.textContent?.trim() ?? '' }
}

function kindOf(row: HTMLTableRowElement, nameCol: number, kinds: Kinds): string {
  const { id, name } = identify(row, nameCol)
  for (const k of KINDS) {
    if (k === '雑魚') continue
    const list = kinds[k] ?? []
    if ((id && list.includes(id)) || (name && list.includes(name))) return k
  }
  return '雑魚'
}

function rankOf(row: HTMLTableRowElement, rankCol: number): number | null {
  const n = Number(row.cells[rankCol]?.textContent?.trim())
  return Number.isInteger(n) && n >= 1 ? n : null
}

function columnIndex(headers: HTMLTableCellElement[], text: string): number {
  return headers.findIndex((th) => th.textContent?.trim() === text)
}

function buildBar(table: HTMLTableElement, kinds: Kinds): HTMLElement | null {
  const headers = [...(table.tHead?.rows[0]?.cells ?? [])] as HTMLTableCellElement[]
  const rows = [...(table.tBodies[0]?.rows ?? [])]
  const rankCol = columnIndex(headers, 'ランク')
  const nameCol = columnIndex(headers, 'モンスター')
  if (rankCol < 0 || nameCol < 0 || !rows.length) return null

  // 行ごとの属性は一度だけ調べておく
  const rank = new Map<HTMLTableRowElement, number | null>()
  const kind = new Map<HTMLTableRowElement, string>()
  for (const r of rows) {
    rank.set(r, rankOf(r, rankCol))
    kind.set(r, kindOf(r, nameCol, kinds))
  }

  const selectedRanks = new Set<number>()
  const selectedKinds = new Set<string>()

  const bar = document.createElement('div')
  bar.className = 'dex-filter'
  bar.setAttribute('role', 'group')
  bar.setAttribute('aria-label', '図鑑の絞り込み')

  const makeButton = (label: string, group: 'rank' | 'kind' | 'all') => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = label
    b.dataset.group = group
    b.setAttribute('aria-pressed', 'false')
    return b
  }

  const apply = () => {
    for (const r of rows) {
      const okRank = selectedRanks.size === 0 || (rank.get(r) !== null && selectedRanks.has(rank.get(r) as number))
      const okKind = selectedKinds.size === 0 || selectedKinds.has(kind.get(r) ?? '雑魚')
      r.classList.toggle(HIDE_CLASS, !(okRank && okKind))
    }
    for (const b of bar.querySelectorAll<HTMLButtonElement>('button')) {
      const on = b.dataset.group === 'rank' ? selectedRanks.has(Number(b.dataset.value))
        : b.dataset.group === 'kind' ? selectedKinds.has(b.dataset.value ?? '')
        : selectedRanks.size === 0 && selectedKinds.size === 0
      b.setAttribute('aria-pressed', on ? 'true' : 'false')
    }
  }

  const rankWrap = document.createElement('span')
  rankWrap.className = 'grp'
  for (const n of RANKS) {
    const b = makeButton(`ランク${n}`, 'rank')
    b.dataset.value = String(n)
    b.addEventListener('click', () => {
      selectedRanks.has(n) ? selectedRanks.delete(n) : selectedRanks.add(n)
      apply()
    })
    rankWrap.appendChild(b)
  }
  const kindWrap = document.createElement('span')
  kindWrap.className = 'grp'
  for (const k of KINDS) {
    const b = makeButton(k, 'kind')
    b.dataset.value = k
    b.addEventListener('click', () => {
      selectedKinds.has(k) ? selectedKinds.delete(k) : selectedKinds.add(k)
      apply()
    })
    kindWrap.appendChild(b)
  }
  const all = makeButton('すべて', 'all')
  all.className = 'all'
  all.addEventListener('click', () => {
    selectedRanks.clear()
    selectedKinds.clear()
    apply()
  })

  bar.append(rankWrap, kindWrap, all)
  apply()
  return bar
}

/** kinds は theme/index.ts が useData().theme.value.monsterKinds を渡す（setup の中でしか取れないため） */
export function setupDexFilter(kinds: Kinds | undefined): void {
  if (!document.querySelector('.Layout.monster-dex')) return
  const table = document.querySelector<HTMLTableElement>('.Layout.monster-dex .vp-doc table')
  if (!table || table.dataset.dexFilter === 'yes') return
  const bar = buildBar(table, kinds ?? {})
  if (!bar) return
  table.dataset.dexFilter = 'yes'
  table.parentElement?.insertBefore(bar, table)
}
