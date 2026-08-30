#!/usr/bin/env node
/**
 * アイテムの一覧ページを作る。
 *
 *   node scripts/gen-item-pages.mjs <MODを展開した ext/assets/dqmvi のパス>
 *
 * 取れているのは名前と分類だけで、攻撃力や守備力の数値はMODのデータに
 * 含まれていない。数値が要るときは、そこから取り出す作業が別に必要。
 *
 * 読むファイル:
 *   legacy_tabs.tsv   … 種別(item/block) / キー / タブ(分類) / コメント
 *   lang/ja_jp.json   … 日本語名
 *
 * 書き出すファイル:
 *   docs/items/index.md
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
 * 載せる分類と、その日本語名。ここに無いタブは載せない。
 * とくに PENDING_REMOVAL(削除予定) と DEBUG(開発用) は、
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

const lang = JSON.parse(readFileSync(join(SRC, 'lang', 'ja_jp.json'), 'utf8'))

/** 日本語名。アイテム・古いアイテム・ブロックの順に探す */
function jpName(key) {
  for (const k of [`item.dqmvi.${key}`, `item.dqmvi.legacy_item_${key}`, `block.dqmvi.${key}`]) {
    if (lang[k]) return String(lang[k]).replace(/^DQM\s+/, '').trim()
  }
  return key
}

const rows = readFileSync(join(SRC, 'legacy_tabs.tsv'), 'utf8')
  .split(/\r?\n/)
  .filter((l) => l.trim() && !l.startsWith('#'))
  .map((l) => l.split('\t'))
  .filter((c) => c[0] === 'item' && TABS.has(c[2]))
  .map((c) => ({ key: c[1], tab: c[2], group: TABS.get(c[2]), name: jpName(c[1]) }))

const collator = new Intl.Collator('ja')
const tabOrder = [...TABS.keys()]
rows.sort((a, b) => (tabOrder.indexOf(a.tab) - tabOrder.indexOf(b.tab)) || collator.compare(a.name, b.name))

const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').trim() || '—'
const counts = new Map()
for (const r of rows) counts.set(r.group, (counts.get(r.group) ?? 0) + 1)

const lines = []
lines.push('---')
lines.push('title: アイテム一覧')
lines.push(`description: DQMVIに出てくるアイテム${rows.length}種の名前と分類の一覧。武器・防具・素材・種・釣り道具など。`)
lines.push('pageClass: wide-page sortable-list')
lines.push('---')
lines.push('')
lines.push('# アイテム一覧')
lines.push('')
lines.push(`DQMVIに出てくるアイテム **${rows.length}種** の名前と分類です。`)
lines.push('')
lines.push('::: tip 探し方')
lines.push('名前が分かっているときは、右上（スマホは上部）の**検索**に入れるのがいちばん早いです。')
lines.push('見出しを押すと、分類ごとや五十音順に並べ替えできます。')
lines.push(':::')
lines.push('')
lines.push('## 分類ごとの数')
lines.push('')
lines.push('| 分類 | 数 |')
lines.push('| --- | ---: |')
for (const [group, n] of counts) lines.push(`| ${cell(group)} | ${n} |`)
lines.push('')
lines.push('## 一覧')
lines.push('')
lines.push('| アイテム | 分類 |')
lines.push('| --- | :--: |')
for (const r of rows) lines.push(`| ${cell(r.name)} | ${cell(r.group)} |`)
lines.push('')
lines.push('## 関連ページ')
lines.push('')
lines.push('- [アイテムの使い方](/play/items)')
lines.push('- [モンスター図鑑](/monsters/)')
lines.push('')

if (!existsSync(ITEM_DIR)) mkdirSync(ITEM_DIR, { recursive: true })
writeFileSync(join(ITEM_DIR, 'index.md'), lines.join('\n'), 'utf8')

console.log(`アイテム: ${rows.length}種`)
for (const [group, n] of counts) console.log(`  ${group}: ${n}`)
