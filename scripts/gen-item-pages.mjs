#!/usr/bin/env node
/**
 * アイテムのページを作る。
 *
 *   node scripts/gen-item-pages.mjs <MODを展開した ext/assets/dqmvi のパス>
 *
 * 取れているのは名前と分類だけで、攻撃力や守備力の数値はMODのデータに
 * 含まれていない。数値が要るときは、そこから取り出す作業が別に必要。
 *
 * 読むファイル:
 *   legacy_tabs.tsv   … 種別(item/block) / キー / タブ(分類)
 *   legacy_order.tsv  … ゲーム内の並び順の番号。番号帯が種類ごとに分かれていて、
 *                       武器なら 1000xx=剣 1001xx=槍 …のようにまとまっている。
 *                       この番号順に並べると、似た装備が自然に隣り合う。
 *                       ★番号そのものは画面に出ないので、並べ替えにだけ使い表には出さない。
 *   lang/ja_jp.json   … 日本語名
 *
 * 書き出すファイル:
 *   docs/items/index.md        目次とそのほかの分類
 *   docs/items/weapons.md      武器
 *   docs/items/armor.md        防具
 *   docs/items/shields.md      盾
 *   docs/items/accessories.md  アクセサリー
 *   docs/items/tensei.md       転生装備
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SRC = process.argv[2]
if (!SRC) {
  console.error('使い方: node scripts/gen-item-pages.mjs <ext/assets/dqmvi のパス>')
  process.exit(1)
}

const ITEM_DIR = join('docs', 'items')

/**
 * 載せる分類。ここに無いタブは載せない。
 * とくに PENDING_REMOVAL(削除予定) と DEBUG(開発用) と UNIMPLEMENTED は、
 * 遊んでいて出会うものではないので必ず除く。
 */
const TABS = new Map([
  ['WEAPONS', '武器'],
  ['ARMOR', '防具'],
  ['SHIELDS_ACCESSORIES', '盾・アクセサリー'],
  ['TENSEI_EQUIPMENT', '転生装備'],
  ['MATERIAL_ITEMS', '素材'],
  ['SEEDS', '種'],
  ['FISHING', '釣り'],
  ['SPECIAL_ITEMS', '特殊'],
  ['MONUMENTS', 'モニュメント'],
  ['MAGIC', '呪文'],
  ['DECORATION_BLOCKS', '装飾']
])

/**
 * 盾とアクセサリーはMODのデータ上ひとつのタブにまとまっているので、ここで分ける。
 * 並び順の番号が 200000〜200099 なら盾、200100以降ならアクセサリー。
 * 番号のない品（49件）と特殊枠の品は名前で判定する。
 * この2つの判定は、番号のある105件すべてで一致することを確認済み
 * （唯一ずれる「シールドあにきの盾」は特殊枠の番号で、名前の判定が正しい）。
 */
const SHIELD_NAME = /(盾|シールド|トレイ|ふた|ガーダー)$/
const isShield = (name, ord) => SHIELD_NAME.test(name) || (ord !== null && ord >= 200000 && ord < 200100)

const lang = JSON.parse(readFileSync(join(SRC, 'lang', 'ja_jp.json'), 'utf8'))

/** 日本語名。アイテム・古いアイテム・ブロックの順に探す */
function jpName(key) {
  for (const k of [`item.dqmvi.${key}`, `item.dqmvi.legacy_item_${key}`, `block.dqmvi.${key}`]) {
    if (lang[k]) return String(lang[k]).replace(/^DQM\s+/, '').trim()
  }
  return key
}

/** タブ区切りを読む（#で始まる行と空行は飛ばす） */
const readRows = (path) => readFileSync(join(SRC, path), 'utf8')
  .split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'))

/** キー → ゲーム内の並び順の番号 */
const order = new Map(readRows('legacy_order.tsv')
  .filter((c) => c[0] === 'item' && c[2])
  .map((c) => [c[1], Number(c[2])]))

const items = readRows('legacy_tabs.tsv')
  .filter((c) => c[0] === 'item' && TABS.has(c[2]))
  .map((c) => {
    const name = jpName(c[1])
    const ord = order.has(c[1]) ? order.get(c[1]) : null
    let group = TABS.get(c[2])
    if (c[2] === 'SHIELDS_ACCESSORIES') group = isShield(name, ord) ? '盾' : 'アクセサリー'
    return { key: c[1], name, ord, group }
  })

const collator = new Intl.Collator('ja')
/** ゲーム内の並び順。番号のない品はうしろにまわして五十音順にする */
function byGameOrder(a, b) {
  if (a.ord !== null && b.ord !== null) return a.ord - b.ord
  if (a.ord !== null) return -1
  if (b.ord !== null) return 1
  return collator.compare(a.name, b.name)
}

const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').trim() || '—'
const pick = (group) => items.filter((i) => i.group === group).sort(byGameOrder)

// ── 装備1種類ぶんのページ ──────────────────────────────────
/**
 * 名前しか分からないので、表ではなく箇条書きにして段組みで見せる。
 * 段組みの指定は custom.css の .Layout.name-list。
 */
const PAGES = [
  { slug: 'weapons', group: '武器', lead: '剣・槍・棍・爪・斧・弓など。' },
  { slug: 'armor', group: '防具', lead: '兜・鎧・小手・服など、身につける装備。' },
  { slug: 'shields', group: '盾', lead: '片手にかまえる盾。なべのふたやトレイもここに入ります。' },
  { slug: 'accessories', group: 'アクセサリー', lead: '指輪・ピアス・首飾り・腕輪など、効果を足す小物。' },
  { slug: 'tensei', group: '転生装備', lead: '転生したモンスターから手に入る装備。' }
]

function equipPage(page) {
  const list = pick(page.group)
  const lines = []
  lines.push('---')
  lines.push(`title: ${page.group}一覧`)
  lines.push(`description: DQMVIの${page.group}${list.length}種の名前の一覧。${page.lead}`)
  lines.push('pageClass: name-list')
  lines.push('---')
  lines.push('')
  lines.push(`# ${page.group}一覧`)
  lines.push('')
  lines.push(`${page.lead}全部で **${list.length}種** です。`)
  lines.push('')
  lines.push('::: tip 探し方')
  lines.push('名前が分かっているときは、右上（スマホは上部）の**検索**に入れるのがいちばん早いです。')
  lines.push('並びはゲーム内の持ち物欄と同じ順なので、似た装備がまとまっています。')
  lines.push(':::')
  lines.push('')
  for (const i of list) lines.push(`- ${cell(i.name)}`)
  lines.push('')
  lines.push('## 関連ページ')
  lines.push('')
  for (const p of PAGES) if (p.slug !== page.slug) lines.push(`- [${p.group}一覧](/items/${p.slug})`)
  lines.push('- [アイテム一覧（そのほか）](/items/)')
  lines.push('')
  return lines.join('\n')
}

// ── 目次ページ ────────────────────────────────────────────
/** 装備以外の分類。目次ページに一覧として置く */
const OTHER = ['素材', '種', '釣り', '特殊', 'モニュメント', '呪文', '装飾']

function indexPage() {
  const others = items.filter((i) => OTHER.includes(i.group)).sort(byGameOrder)
  const lines = []
  lines.push('---')
  lines.push('title: アイテム一覧')
  lines.push(`description: DQMVIに出てくるアイテム${items.length}種。武器・防具・盾・アクセサリー・転生装備は種類ごとのページに分けています。`)
  lines.push('pageClass: wide-page sortable-list')
  lines.push('---')
  lines.push('')
  lines.push('# アイテム一覧')
  lines.push('')
  lines.push(`DQMVIに出てくるアイテムは **${items.length}種** です。`)
  lines.push('')
  lines.push('## 装備')
  lines.push('')
  lines.push('| 種類 | 数 | 中身 |')
  lines.push('| --- | ---: | --- |')
  for (const p of PAGES) {
    lines.push(`| [${p.group}](/items/${p.slug}) | ${pick(p.group).length} | ${cell(p.lead)} |`)
  }
  lines.push('')
  lines.push('## そのほか')
  lines.push('')
  lines.push(`装備以外の **${others.length}種** です。見出しを押すと分類ごとや五十音順に並べ替えできます。`)
  lines.push('')
  lines.push('| アイテム | 分類 |')
  lines.push('| --- | :--: |')
  for (const i of others) lines.push(`| ${cell(i.name)} | ${cell(i.group)} |`)
  lines.push('')
  lines.push('## 関連ページ')
  lines.push('')
  lines.push('- [アイテムの使い方](/play/items)')
  lines.push('- [鍛冶](/play/smithing) / [農業](/play/farming) / [釣り](/play/fishing)')
  lines.push('')
  return lines.join('\n')
}

// ── 書き出し ──────────────────────────────────────────────
if (!existsSync(ITEM_DIR)) mkdirSync(ITEM_DIR, { recursive: true })
for (const p of PAGES) writeFileSync(join(ITEM_DIR, `${p.slug}.md`), equipPage(p), 'utf8')
writeFileSync(join(ITEM_DIR, 'index.md'), indexPage(), 'utf8')

console.log(`アイテム: ${items.length}種`)
for (const p of PAGES) console.log(`  ${p.group}: ${pick(p.group).length}`)
console.log(`  そのほか: ${items.filter((i) => OTHER.includes(i.group)).length}`)
