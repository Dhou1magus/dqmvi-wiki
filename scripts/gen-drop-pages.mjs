#!/usr/bin/env node
/**
 * ドロップ品からの逆引きページを作る。
 *
 *   node scripts/gen-drop-pages.mjs <MODを展開した ext/assets/dqmvi のパス>
 *
 * 「このアイテムはどのモンスターが落とすのか」を、アイテム名から1回で引けるようにする。
 * モンスターページからは「何を落とすか」しか分からないので、その逆をここで作る。
 *
 * ★飾りの「オブジェ」「フィギュア」は作らない（950種あって目的の品が埋もれるため。
 *   2026-08-31 よっしー判断）。判定はアイテム名に「オブジェ」「フィギュア」が
 *   入っているかどうかで行う。キーの形（_ob / _f）では判定しないこと —
 *   転生系のように、レア枠・超レア枠がそのまま飾りになっている個体がいるため。
 *
 * 読むもの:
 *   scripts/data/monster-extras.json … 各モンスターのドロップ（キー・区分）
 *   scripts/data/equipment.json      … 装備なら、その数値も一緒に載せる
 *   monster_stats.tsv / boss_ai.tsv  … モンスターのHP・EXP・図鑑順・ボス判定
 *   legacy_tabs.tsv                  … アイテムの分類
 *   lang/ja_jp.json                  … 日本語名
 *   scripts/data/monster-blank.json  … 中身を空欄にするモンスター（逆引きにも出さない）
 *
 * 書き出すもの:
 *   docs/drops/index.md   ドロップ品の一覧（1枚の表・並べ替え可）
 *   docs/drops/<slug>.md  アイテム1種1ページ
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { recordCounts } from './lib/counts.mjs'
import { extraRows, leftoverTables, finish, withExtraSections, mergeHandwrittenPages, plainName } from './lib/handwritten.mjs'
import { fixMonsterName } from './lib/monster-names.mjs'
import { BLANK_MONSTERS } from './lib/blank-monsters.mjs'

const SRC = process.argv[2]
if (!SRC) {
  console.error('使い方: node scripts/gen-drop-pages.mjs <ext/assets/dqmvi のパス>')
  process.exit(1)
}

const OUT_DIR = join('docs', 'drops')
const EXTRAS = JSON.parse(readFileSync(join('scripts', 'data', 'monster-extras.json'), 'utf8'))
const EQ_PATH = join('scripts', 'data', 'equipment.json')
const EQ = existsSync(EQ_PATH)
  ? JSON.parse(readFileSync(EQ_PATH, 'utf8'))
  : { weapons: {}, armor: {}, shields: {}, accessories: {}, weaponKindNames: {} }

// ── 版ずれの見張り（gen-monster-pages.mjs と同じ考え方）────────
{
  const version = (s) => String(s ?? '').match(/(\d+\.\d+\.\d+)/)?.[1] ?? null
  const seen = new Map()
  if (EXTRAS.jar) seen.set(version(EXTRAS.jar), 'monster-extras.json')
  const ev = version(EQ.jar)
  if (ev && !seen.has(ev)) seen.set(ev, 'equipment.json')
  const sv = version(SRC)
  if (sv && !seen.has(sv)) seen.set(sv, '展開したassets')
  if (seen.size > 1) {
    console.error('中止: MODのバージョンが揃っていません。')
    for (const [v, where] of seen) console.error(`  ${v}  ← ${where}`)
    process.exit(1)
  }
}

// ── 読み込み ──────────────────────────────────────────────
const lang = JSON.parse(readFileSync(join(SRC, 'lang', 'ja_jp.json'), 'utf8'))

function readTsv(name) {
  const out = []
  let head = null
  for (const line of readFileSync(join(SRC, name), 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue
    const cols = line.split('\t')
    if (!head) { head = cols; continue }
    out.push(Object.fromEntries(head.map((h, i) => [h, cols[i] ?? ''])))
  }
  return out
}

const stats = readTsv('monster_stats.tsv')
stats.forEach((m, i) => { m.dexNo = i + 1 })
const statById = new Map(stats.map((m) => [m.id, m]))
const bossIds = new Set(readTsv('boss_ai.tsv').map((b) => b.id))

/** モンスターの日本語名。スポーンエッグのアイテム名から引く（lib/monster-names.mjs の直しを当てる） */
function monsterName(id) {
  const raw = lang[`item.dqmvi.${id}_spawn_egg`]
  if (!raw) {
    // スポーンエッグの名前が無い個体は monster_stats.tsv の displayName（gen-monster-pages.mjs と同じ）
    const dn = statById.get(id)?.displayName ?? ''
    return fixMonsterName(id, /[^\x00-\x7f]/.test(dn) ? dn.trim() : id)
  }
  return fixMonsterName(id, raw.replace(/^DQM\s+/, '').replace(/\s*の?スポーンエッグ$/, '').trim())
}

/** アイテムの分類。legacy_tabs.tsv のタブを日本語にする */
const TAB_JA = new Map([
  ['WEAPONS', '武器'], ['ARMOR', '防具'], ['SHIELDS_ACCESSORIES', '盾・アクセサリー'],
  ['TENSEI_EQUIPMENT', '転生装備'], ['MATERIAL_ITEMS', '素材'], ['SEEDS', '種'],
  ['FISHING', '釣り'], ['SPECIAL_ITEMS', '特殊'], ['MONUMENTS', '建物'],
  ['MAGIC', '呪文'], ['DECORATION_BLOCKS', '装飾'], ['SPECIAL_BLOCKS', '特殊'],
  ['FACILITY_BLOCKS', '施設']
])
const tabOf = new Map()
for (const line of readFileSync(join(SRC, 'legacy_tabs.tsv'), 'utf8').split(/\r?\n/)) {
  if (!line.trim() || line.startsWith('#')) continue
  const c = line.split('\t')
  if (c.length > 2) tabOf.set(c[1], c[2])
}

// ── アイテムごとに、落とすモンスターを集める ────────────────
/** 飾りかどうかは「名前に入っているか」で決める。キーの形では決めない */
const isDecoration = (name) => /オブジェ|フィギュア/.test(name)
/** legacy_item_ / legacy_block_ を外した素のキー */
const baseKey = (key) => key.replace(/^legacy_(item|block)_/, '')
/** ページのファイル名。バニラの minecraft:xxx は mc_xxx にする */
const slugOf = (key) => baseKey(key).replace(/^minecraft:/, 'mc_').replace(/[^A-Za-z0-9_]/g, '_')

const TIER_RANK = { '通常ドロップ': 0, 'レアドロップ': 1, '超レアドロップ': 2 }
const TIER_SHORT = { '通常ドロップ': '通常', 'レアドロップ': 'レア', '超レアドロップ': '超レア' }

/** key → { key, name, slug, group, from: [{ id, tier }] } */
const itemsMap = new Map()
/** 空欄のモンスターだけが落とす品の名前。一覧の「知らない行」の判定に足す（古い行が手書き扱いで戻らないように） */
const blankOnlyNames = new Set()
for (const [mid, x] of Object.entries(EXTRAS.monsters ?? {})) {
  if (!statById.has(mid)) continue // 図鑑に無い個体は載せない
  if (bossIds.has(mid)) continue // ★魔王ボスは載せない（ボスの情報は全部出さない方針）
  if (BLANK_MONSTERS.has(mid)) { // ★空欄のモンスター（monster-blank.json）は逆引きに出さない
    for (const d of x.drops ?? []) if (!isDecoration(d.item)) blankOnlyNames.add(plainName(d.item))
    continue
  }
  for (const d of x.drops ?? []) {
    if (isDecoration(d.item)) continue
    const bk = baseKey(d.key)
    if (!itemsMap.has(bk)) {
      itemsMap.set(bk, {
        key: bk, name: d.item, slug: slugOf(d.key),
        group: TAB_JA.get(tabOf.get(bk)) ?? (bk.startsWith('minecraft:') ? 'マイクラ標準' : 'そのほか'),
        from: []
      })
    }
    itemsMap.get(bk).from.push({ id: mid, tier: d.tier })
  }
}

const collator = new Intl.Collator('ja')
/** 手に入れやすい順。通常→レア→超レアで並べ、同じ区分なら弱い相手（EXPが小さい）が先 */
function byEase(a, b) {
  const ra = TIER_RANK[a.tier] ?? 9
  const rb = TIER_RANK[b.tier] ?? 9
  if (ra !== rb) return ra - rb
  const ea = Number(statById.get(a.id)?.dqExperience ?? 0)
  const eb = Number(statById.get(b.id)?.dqExperience ?? 0)
  if (ea !== eb) return ea - eb
  return (statById.get(a.id)?.dexNo ?? 0) - (statById.get(b.id)?.dexNo ?? 0)
}
for (const it of itemsMap.values()) {
  it.from.sort(byEase)
  // 同じモンスターが同じ品を2枠で落とすことがある（プレミアムスライムのべっこうなど）。
  // 一覧では手前の枠だけ残す。両方の枠はモンスター側のページで分かる。
  const seen = new Set()
  it.from = it.from.filter((f) => !seen.has(f.id) && seen.add(f.id))
}

const items = [...itemsMap.values()].sort((a, b) => collator.compare(a.name, b.name))

// ── 表示のこまごま ────────────────────────────────────────
const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').trim() || '—'
const num = (v) => (v === '' || v == null ? '—' : Number(v).toLocaleString('ja-JP'))
const mul = (v) => (v == null ? '—' : `×${Number(v).toFixed(2).replace(/\.?0+$/, '')}`)
const dirOf = (id) => (bossIds.has(id) ? 'bosses' : 'monsters')
const linkTo = (id) => `[${cell(monsterName(id))}](/${dirOf(id)}/${id})`

/**
 * 「ドラゴン系に2倍のダメージ」のような効果から、その系統の一覧に繋ぐ。
 * ★scripts/gen-monster-pages.mjs の SPECIES_SLUG と同じ対応表。片方だけ直さないこと。
 */
const SPECIES_SLUG = new Map([
  ['スライム', 'slime'], ['ドラゴン', 'dragon'], ['悪魔', 'akuma'], ['ゾンビ', 'zombie'],
  ['魔獣', 'majyu'], ['自然', 'sizen'], ['物質', 'bussitu'], ['メタル', 'metal'], ['特殊', 'tokusyu']
])
const withSpeciesLink = (text) => (text
  ? String(text).replace(/(スライム|ドラゴン|悪魔|ゾンビ|魔獣|自然|物質|メタル)系/g,
      (m, name) => `[${m}](/species/${SPECIES_SLUG.get(name)})`)
  : '—')

/** 装備なら、その数値を「項目: 値」の並びで返す。装備でなければ null */
function equipRows(key) {
  const w = EQ.weapons?.[key]
  if (w) {
    return [['種類', `武器（${w.武器種 ?? '—'}）`], ['こうげき', w.こうげき ?? '—'],
            ['攻撃倍率', mul(w.攻撃倍率)], ['特殊効果', withSpeciesLink(w.特殊効果)]]
  }
  const a = EQ.armor?.[key]
  if (a) {
    const other = ['こうげき', 'HP', 'MP'].filter((k) => a[k]).map((k) => `${k} ${mul(a[k])}`).join('・')
    return [['種類', `防具（${a.部位 ?? '—'}）`], ['しゅび', mul(a.しゅび)],
            ['魔法しゅび', mul(a.魔法しゅび)], ['そのほか', other || '—'],
            ['特殊効果', withSpeciesLink(a.特殊効果)]]
  }
  const s = EQ.shields?.[key]
  if (s) {
    return [['種類', '盾'], ['しゅび', mul(s.しゅび)], ['魔法しゅび', mul(s.魔法しゅび)],
            ['構え中', mul(s.構え中)], ['特殊効果', withSpeciesLink(s.特殊効果)]]
  }
  const c = EQ.accessories?.[key]
  if (c) {
    const rows = [['種類', 'アクセサリー']]
    for (const k of ['HP', 'MP', 'こうげき', 'しゅび', '魔法しゅび', 'まりょく']) {
      if (c[k]) rows.push([k, mul(c[k])])
    }
    if (c.特殊効果) rows.push(['特殊効果', withSpeciesLink(c.特殊効果)])
    return rows
  }
  return null
}

/** 手を入れた「## 攻略メモ」以下は再生成しても残す（モンスターページと同じ約束） */
const KEEP_MARK = '## 攻略メモ'
function writeKeeping(path, body) {
  let tail = `\n${KEEP_MARK}\n\n（未記入）\n`
  if (existsSync(path)) {
    const cur = readFileSync(path, 'utf8')
    const at = cur.indexOf(KEEP_MARK)
    if (at >= 0) tail = `\n${cur.slice(at)}`
  }
  // 手書きで足された見出し（## / ###）も引き継ぐ
  writeFileSync(path, withExtraSections(body.replace(/\n+$/, '\n') + tail, path), 'utf8')
}

// ── 1アイテムぶんのページ ──────────────────────────────────
function itemPage(it) {
  const best = it.from[0]
  const bestName = monsterName(best.id)
  const bestExp = num(statById.get(best.id)?.dqExperience)
  const eq = equipRows(it.key)

  const lines = []
  lines.push('---')
  lines.push(`title: ${it.name}`)
  lines.push(`description: DQMVIの「${it.name}」を落とすモンスター${it.from.length}体の一覧。いちばん弱いのは${bestName}（${TIER_SHORT[best.tier] ?? best.tier}・EXP${bestExp}）。`)
  lines.push('pageClass: wide-page sortable-list')
  lines.push('---')
  lines.push('')
  lines.push(`# ${it.name}`)
  lines.push('')
  lines.push(`${it.group}。**${it.from.length}体**のモンスターが落とします。`)
  lines.push('')
  lines.push('::: tip ねらい目')
  lines.push(`**${bestName}**（${TIER_SHORT[best.tier] ?? best.tier}ドロップ・EXP${bestExp}）。`)
  lines.push('落とす枠がいちばん手前で、そのなかで一番弱い相手です。')
  lines.push(':::')
  lines.push('')

  if (eq) {
    lines.push('## 装備としての性能')
    lines.push('')
    lines.push('| 項目 | 内容 |')
    lines.push('| --- | --- |')
    for (const [k, v] of eq) lines.push(`| ${cell(k)} | ${cell(v)} |`)
    lines.push('')
    lines.push('倍率は、いまの能力に掛かる値です。')
    lines.push('')
  }

  lines.push('## 落とすモンスター')
  lines.push('')
  lines.push('| モンスター | 区分 | ランク | 系統 | HP | EXP | 出現場所 |')
  lines.push('| --- | :--: | :--: | :--: | ---: | ---: | --- |')
  for (const f of it.from) {
    const m = statById.get(f.id)
    const x = EXTRAS.monsters[f.id] ?? {}
    lines.push(`| ${linkTo(f.id)} | ${cell(TIER_SHORT[f.tier] ?? f.tier)} | ${x.rank ?? '—'} | ${x.species && SPECIES_SLUG.has(x.species) ? `[${cell(x.species)}](/species/${SPECIES_SLUG.get(x.species)})` : cell(x.species ?? '—')} | ${num(m?.health)} | ${num(m?.dqExperience)} | ${cell(x.places?.length ? x.places.join('・') : 'ふつうの土地')} |`)
  }
  lines.push('')
  lines.push('見出しを押すと並べ替えできます。')
  lines.push('')
  lines.push('## 関連ページ')
  lines.push('')
  lines.push('- [ドロップ品から探す](/drops/)')
  lines.push('- [モンスター図鑑](/monsters/)')
  lines.push('- [系統から探す](/species/)')
  lines.push('- [アイテム一覧](/items/)')
  lines.push('')
  return lines.join('\n')
}

// ── 一覧ページ ────────────────────────────────────────────
function indexPage() {
  const lines = []
  lines.push('---')
  lines.push('title: ドロップ品から探す')
  lines.push(`description: DQMVIでモンスターが落とすアイテム${items.length}種。アイテム名から、それを落とすモンスターを逆に引けます。`)
  lines.push('pageClass: wide-page sortable-list')
  lines.push('---')
  lines.push('')
  lines.push('# ドロップ品から探す')
  lines.push('')
  lines.push(`モンスターが落とすアイテムは **${items.length}種** です。`)
  lines.push('欲しいアイテムを押すと、それを落とすモンスターが全部出ます。')
  lines.push('')
  lines.push('::: tip 見かた')
  lines.push('**ねらい目**は、落とす枠がいちばん手前（通常＞レア＞超レア）で、')
  lines.push('そのなかで一番弱い相手です。数を集めたいときはここから狩るのが早いです。')
  lines.push('')
  lines.push('飾りの「オブジェ」と「フィギュア」は数が多すぎて目的の品が埋もれるため載せていません。')
  lines.push('モンスターのページを見れば、そのモンスターが落とす飾りが分かります。')
  lines.push(':::')
  lines.push('')
  lines.push('| アイテム | 分類 | 落とす数 | ねらい目 | 区分 | EXP |')
  lines.push('| --- | :--: | ---: | --- | :--: | ---: |')
  for (const it of items) {
    const best = it.from[0]
    lines.push(`| [${cell(it.name)}](/drops/${it.slug}) | ${cell(it.group)} | ${it.from.length} | ${linkTo(best.id)} | ${cell(TIER_SHORT[best.tier] ?? best.tier)} | ${num(statById.get(best.id)?.dqExperience)} |`)
  }
  const path = join(OUT_DIR, 'index.md')
  const extra = extraRows(path, new Set([...items.map((it) => plainName(it.name)), ...blankOnlyNames]))
  lines.push(...(extra.get('')?.rows ?? []))
  lines.push('')
  lines.push(...leftoverTables(extra, new Set()))
  lines.push('## 関連ページ')
  lines.push('')
  lines.push('- [モンスター図鑑](/monsters/)')
  lines.push('- [系統から探す](/species/)')
  lines.push('- [アイテム一覧](/items/)')
  lines.push('- [出現場所から探す](/biomes/)')
  lines.push('')
  return finish(lines.join('\n'), path)
}

// ── 書き出し ──────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true })

for (const it of items) writeKeeping(join(OUT_DIR, `${it.slug}.md`), itemPage(it))
writeFileSync(join(OUT_DIR, 'index.md'), indexPage(), 'utf8')

// 生成側に無いファイル名のページ: 手書きで足された逆引きは title で正式ページに統合する。
// MODから消えた品の古いページも同じく「同じ名前が無い」として残る（消すなら手で。勝手には消さない）
const removed = 0
mergeHandwrittenPages(OUT_DIR, items.map((it) => [it.name, it.slug]), '手書きの逆引き')

const withStats = items.filter((i) => equipRows(i.key)).length
console.log(`ドロップ品:     ${items.length}種`)
console.log(`  うち装備:     ${withStats}種（性能も一緒に載せた）`)
console.log(`落とす関係:     ${items.reduce((n, i) => n + i.from.length, 0)}件`)
console.log(`1体だけが落とす: ${items.filter((i) => i.from.length === 1).length}種`)
if (removed) console.log(`消したページ:   ${removed}件`)
console.log(`書き出し:       ${OUT_DIR} に ${items.length + 1}ファイル`)

recordCounts({ drops: items.length })
