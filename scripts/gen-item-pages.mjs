#!/usr/bin/env node
/**
 * アイテムのページを作る。
 *
 *   node scripts/gen-item-pages.mjs <MODを展開した ext/assets/dqmvi のパス>
 *
 * 数値は scripts/data/equipment.json（固定データ。scripts/data/README.md）を読む。無ければ名前だけのページになる。
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
 *   docs/items/materials.md    素材   ┐
 *   docs/items/seeds.md        種     │ 装備以外の分類ごとの一覧（OTHER_PAGES）。
 *   docs/items/fishing.md      釣り   │ 品名と「入手方法」（モンスター・宝箱・鍛冶・店…）。
 *   docs/items/special.md      特殊   │ 入手方法は scripts/data/item-sources.json（固定データ）と
 *   docs/items/buildings.md    建物   │ monster-extras.json のドロップから
 *   docs/items/magic.md        呪文   │
 *   docs/items/decoration.md   装飾   ┘
 *   docs/items/<キー>.md        逆引きページの無い品の個別ページ（名前だけ。無いときだけ作る）
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { recordCounts } from './lib/counts.mjs'
import { recordNames } from './lib/names.mjs'
import { extraRows, leftoverTables, finish, plainName } from './lib/handwritten.mjs'

/** MOD本体から取り出した装備の数値。無くても名前だけで作れるようにしておく */
const STATS_PATH = join('scripts', 'data', 'equipment.json')
const STATS = existsSync(STATS_PATH)
  ? JSON.parse(readFileSync(STATS_PATH, 'utf8'))
  : { weapons: {}, armor: {}, shields: {}, accessories: {} }

/** 倍率は小数が長く出るので2桁に丸める。1.19 のように末尾の0は消す */
const mul = (v) => (v == null ? '—' : `×${Number(v).toFixed(2).replace(/\.?0+$/, '')}`)
const int = (v) => (v == null ? '—' : String(v))
/** 武器種の並び。ゲーム内の分類そのままで、推測は入れていない */
const WEAPON_ORDER = ['剣', '勇者の剣', '槍', '短剣', '杖', '棍', '爪', '拳',
                      'ハンマー', '斧', 'ムチ', '弓', 'ブーメラン', 'バニラ剣']

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
  ['MONUMENTS', '建物'],
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

const readRows = (path) => readFileSync(join(SRC, path), 'utf8')
  .split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'))

/**
 * ★魔王ボス（boss_ai.tsv に載っている個体）にまつわる品（「○○討伐の証」）は一覧に出さない。
 *   ボスの情報は全部出さない方針（2026-09-02 よっしー指示）。
 *   名前ではなくキーで判定する（竜王／デスピサロ第1形態／呪われた剣 は名前が一致しないため）。
 *   desupisaro1_big → desupisaro、ryuuou2 → ryuuou のように末尾の _big と数字を落として突き合わせる。
 *   「ロトの剣」のように、ボスと同じ名前の武器そのものは残す（討伐の証ではない別物）。
 *   「転生モンスター討伐の証」はボスではないので残す。
 */
const BOSS_IDS = new Set(readRows('boss_ai.tsv').map((c) => c[0]).filter((id) => id && id !== 'id'))
const BOSS_STEMS = new Set([...BOSS_IDS].map((id) => id.replace(/_big$/, '').replace(/\d+$/, '')))
const isBossItem = (key, name) => /討伐の証/.test(name) && BOSS_STEMS.has(key.replace(/^legacy_(item|block)_/, ''))

/**
 * モンスターが落とす品のキー。落ちるものは /drops/ の逆引きページに繋ぐ。
 * ★ページ名の作り方は scripts/gen-drop-pages.mjs の slugOf と必ず揃えること。
 */
const DROPPED = new Set()
{
  const path = join('scripts', 'data', 'monster-extras.json')
  if (existsSync(path)) {
    const extras = JSON.parse(readFileSync(path, 'utf8'))
    for (const [mid, m] of Object.entries(extras.monsters ?? {})) {
      if (BOSS_IDS.has(mid) || BOSS_IDS.has(m.id)) continue // ★魔王ボスの落とし物は逆引きページが無い
      for (const d of m.drops ?? []) {
        if (!/オブジェ|フィギュア/.test(d.item) && d.key) {
          DROPPED.add(d.key.replace(/^legacy_(item|block)_/, ''))
        }
      }
    }
  }
}
const dropSlug = (key) => key.replace(/^minecraft:/, 'mc_').replace(/[^A-Za-z0-9_]/g, '_')
/**
 * 入手方法。scripts/data/item-sources.json（固定データ）を読む
 * （モンスターのドロップだけは monster-extras.json 由来の DROPPED で判定する）。
 * 出す順は SOURCE_ORDER のとおり。ここに無い種類（「系統のレアドロップ」など図鑑に出ないもの）は出さない。
 */
/**
 * 素材のランク（どのランクの土地から手に入り始めるか）と鉱石のランク・深さ。
 * ゲーム内の Z メニュー「素材取得一覧表」「鉱石取得一覧表」と同じ内容。scripts/data/material-ranks.json（固定データ）
 */
const RANKS_PATH = join('scripts', 'data', 'material-ranks.json')
const RANKS = existsSync(RANKS_PATH) ? JSON.parse(readFileSync(RANKS_PATH, 'utf8')) : { materials: [], ores: [] }
// material-ranks.json のキーは legacy_item_〜 付き。このスクリプトのキー（legacy_tabs.tsv の2列目）は接頭辞なし
const materialRank = new Map(RANKS.materials.map((m) => [m.key.replace(/^legacy_item_/, ''), m.ranks]))
/** 「1〜」= ランク1の土地から。「3」= ランク3の土地だけ */
const rankLabel = (ranks) => (!ranks?.length ? '—' : ranks.length === 1 ? String(ranks[0]) : `${ranks[0]}〜`)
const SOURCES_PATH = join('scripts', 'data', 'item-sources.json')
const SOURCES = existsSync(SOURCES_PATH) ? JSON.parse(readFileSync(SOURCES_PATH, 'utf8')).sources ?? {} : {}
const SOURCE_ORDER = ['モンスター', 'モンスター（まれに）', '宝箱', '鍛冶', '武器屋', '防具屋', '道具屋', '魚交換所',
                      '農業', '採取', '釣り', 'カジノ', '福引', 'メダル王', 'すごろく', '依頼の報酬', '精錬',
                      'コロシアム', 'モンスター図鑑の記念', '釣り図鑑の完成']
function sourcesOf(i) {
  const list = new Set([...(DROPPED.has(i.key) ? ['モンスター'] : []), ...(SOURCES[i.key] ?? [])])
  const out = SOURCE_ORDER.filter((s) => list.has(s))
  return out.length ? out.join('・') : '—'
}
/**
 * 「ドラゴン系に2倍のダメージ」のような効果から、その系統の一覧に繋ぐ。
 * ★scripts/gen-monster-pages.mjs の SPECIES_SLUG と同じ対応表。片方だけ直さないこと。
 */
const SPECIES_SLUG = new Map([
  ['スライム', 'slime'], ['ドラゴン', 'dragon'], ['悪魔', 'akuma'], ['ゾンビ', 'zombie'],
  ['魔獣', 'majyu'], ['自然', 'sizen'], ['物質', 'bussitu'], ['メタル', 'metal'], ['特殊', 'tokusyu']
])
function withSpeciesLink(text) {
  if (!text) return '—'
  return String(text).replace(/(スライム|ドラゴン|悪魔|ゾンビ|魔獣|自然|物質|メタル)系/g,
    (m, name) => `[${m}](/species/${SPECIES_SLUG.get(name)})`)
}
/** 品名のリンク。モンスターから手に入るものは /drops/ の逆引きへ、それ以外は /items/ の個別ページへ */
const itemLink = (i) => (DROPPED.has(i.key) ? `[${i.name}](/drops/${dropSlug(i.key)})` : `[${i.name}](/items/${pageOf(i)})`)

/** 日本語名。アイテム・古いアイテム・ブロックの順に探す */
/** lang に無い品の名前。legacy_tabs.tsv の各行末の注記（# 名前）から拾う（作者が lang を入れ忘れた品がある） */
const TAB_NAMES = new Map(readRows('legacy_tabs.tsv')
  .filter((c) => c[3]?.startsWith('# '))
  .map((c) => [c[1], c[3].slice(2).trim()]))
function jpName(key) {
  for (const k of [`item.dqmvi.${key}`, `item.dqmvi.legacy_item_${key}`, `block.dqmvi.${key}`]) {
    if (lang[k]) return String(lang[k]).replace(/^DQM\s+/, '').trim()
  }
  return TAB_NAMES.get(key.replace(/^legacy_(item|block)_/, '')) ?? key
}

/** タブ区切りを読む（#で始まる行と空行は飛ばす） */
/** キー → ゲーム内の並び順の番号 */
const order = new Map(readRows('legacy_order.tsv')
  .filter((c) => c[0] === 'item' && c[2])
  .map((c) => [c[1], Number(c[2])]))

const items = readRows('legacy_tabs.tsv')
  .filter((c) => c[0] === 'item' && TABS.has(c[2]))
  .filter((c) => !isBossItem(c[1], jpName(c[1])))
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
/**
 * 装備以外の分類ごとのページ（2026-09-03 よっしー指示「素材だけのページ、種だけのページ…を作って」）。
 * group は TABS の日本語名と同じにすること。
 */
const OTHER_PAGES = [
  { slug: 'materials', group: '素材', lead: 'モンスターの落とし物・鉱石・薬など。', guide: ['[鍛冶](/play/smithing)'] },
  { slug: 'seeds', group: '種', lead: '畑に植える苗と、育てて採れる作物。', guide: ['[農業](/play/farming)'] },
  { slug: 'fishing', group: '釣り', lead: '釣り竿・ルアーと、釣れる魚。', guide: ['[釣り](/play/fishing)'] },
  { slug: 'special', group: '特殊', lead: '鍵・袋・職業の証・チケットなど。', guide: ['[アイテムの使い方](/play/items)'] },
  { slug: 'buildings', group: '建物', lead: 'ポートに入れるとペットが建ててくれる施設。', guide: ['[施設と暮らし](/play/facilities)'] },
  { slug: 'magic', group: '呪文', lead: '配合の杖と転生の杖。', guide: ['[ペットと配合](/play/pets)'] },
  { slug: 'decoration', group: '装飾', lead: '鍵で開く扉など。', guide: [] }
]
/** 釣りのページは、釣り竿・ルアー・魚で見出しを分ける */
const fishingKind = (key) => (/^turizao/.test(key) ? '釣り竿' : /^rua/.test(key) ? 'ルアー' : /^sakana/.test(key) ? '魚' : 'そのほか')

// ── 個別ページ ────────────────────────────────────────────
/**
 * 逆引きページの無い品には /items/<キー>.md を1枚ずつ用意する（2026-09-02 よっしー指示）。
 * 中身は名前だけで、何を書くかは編集者にまかせる。
 * ★一度作ったページは再生成で触らない（無いときだけ作る）。手書きの本文をそのまま残すため。
 *   ファイル名はキーで、/drops/ と同じ作り方（dropSlug）。
 * 編集者が同じ title のページを別のファイル名で先に作っていたら、そちらをその品のページにする。
 */
const STUB_ITEMS = items.filter((i) => !DROPPED.has(i.key))
{
  // frontmatter に素で書けない名前（YAMLの記号で始まる・「: 」を含む）が来たら止める。今の品には無い
  const unsafe = STUB_ITEMS.filter((i) => /^[[\]{}"'!&*|>%@`\-?:,#]/.test(i.name) || /: | #|[\t\r\n]/.test(i.name))
  const reserved = new Set(['index', ...PAGES.map((p) => p.slug), ...OTHER_PAGES.map((p) => p.slug)])
  const clash = STUB_ITEMS.filter((i) => reserved.has(dropSlug(i.key)))
  if (unsafe.length || clash.length) {
    console.error('個別ページにできない名前・キー:', [...unsafe, ...clash].map((i) => `${i.name}(${i.key})`).join(' '))
    process.exit(1)
  }
}
/** 生成側に無いファイル名のページを title で拾う。title → ファイル名（同名が複数なら null） */
function handwrittenByTitle() {
  const known = new Set(['index', ...PAGES.map((p) => p.slug), ...OTHER_PAGES.map((p) => p.slug),
                         ...STUB_ITEMS.map((i) => dropSlug(i.key))])
  const out = new Map()
  if (!existsSync(ITEM_DIR)) return out
  for (const f of readdirSync(ITEM_DIR)) {
    if (!f.endsWith('.md') || known.has(f.slice(0, -3))) continue
    const title = plainName((/^title:\s*(.+)$/m.exec(readFileSync(join(ITEM_DIR, f), 'utf8')) ?? [])[1] ?? '')
    if (title) out.set(title, out.has(title) ? null : f.slice(0, -3))
  }
  return out
}
const HANDWRITTEN = handwrittenByTitle()
const STEM = new Map()   // キー → 個別ページのファイル名（拡張子なし）
{
  const sameName = new Map()
  for (const i of STUB_ITEMS) sameName.set(i.name, (sameName.get(i.name) ?? 0) + 1)
  for (const i of STUB_ITEMS) {
    const own = dropSlug(i.key)
    const hw = HANDWRITTEN.get(i.name)
    // 自分のページがまだ無く、同じ名前の手書きページが1枚だけあれば、それを使う（同名の品が2つあるときは使わない）
    STEM.set(i.key, !existsSync(join(ITEM_DIR, `${own}.md`)) && hw && sameName.get(i.name) === 1 ? hw : own)
  }
}
const pageOf = (i) => STEM.get(i.key)

/** 無い個別ページを作る。作った数と、編集者のページを使った数を返す */
function writeStubs() {
  let made = 0
  const adopted = []
  for (const i of STUB_ITEMS) {
    const stem = STEM.get(i.key)
    if (stem !== dropSlug(i.key)) { adopted.push(`${i.name} → ${stem}.md`); continue }
    const path = join(ITEM_DIR, `${stem}.md`)
    if (existsSync(path)) continue
    writeFileSync(path, `---\ntitle: ${i.name}\n---\n\n# ${i.name}\n`, 'utf8')
    made++
  }
  return { made, adopted }
}

/** 職業ID → 名前（盾の適正職業に使う） */
const JOB_NAME = new Map(
  readFileSync(join(SRC, 'job_skills.tsv'), 'utf8').split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith('#')).slice(1)
    .map((l) => l.split('\t')).map((c) => [Number(c[0]), c[1]])
)
/**
 * 適正職業の並び。ほとんどの職業で使える盾は17職ぶん並んで読めなくなるので、
 * その場合は「〜以外」の形にする。
 */
function jobList(ids) {
  const list = ids ?? []
  if (!list.length) return '—'
  const all = [...JOB_NAME.keys()]
  if (list.length === all.length) return 'すべての職業'
  const out = list.map((i) => JOB_NAME.get(i) ?? i)
  if (list.length > all.length - 4) {
    const rest = all.filter((i) => !list.includes(i)).map((i) => JOB_NAME.get(i) ?? i)
    return `${rest.join('・')} 以外`
  }
  return out.join('・')
}

/** 装備の種類ごとに、表の見出しと1行の作り方を決める */
const SHAPE = {
  武器: {
    head: ['武器', 'こうげき', '攻撃倍率', '特殊効果'],
    align: ['---', '---:', '---:', '---'],
    // 一部の棍は呪文の威力にも倍率がかかる（ツールチップの「魔力倍率」）。列を増やさず特殊効果の欄に添える
    row: (i, d) => [itemLink(i), int(d.こうげき), mul(d.攻撃倍率),
                    [withSpeciesLink(d.特殊効果), d.魔力倍率 ? `魔力倍率 ${mul(d.魔力倍率)}` : ''].filter((t) => t && t !== '—').join('　/　') || '—'],
    of: (key) => STATS.weapons[key] ?? {}
  },
  // 呪文を唱えるための杖。武器としての攻撃力は無く、呪文の威力にかかる倍率がある
  杖: {
    head: ['杖', '魔力倍率', '特殊効果'],
    align: ['---', '---:', '---'],
    row: (i, d) => [itemLink(i), mul(d.魔力倍率), withSpeciesLink(d.特殊効果)],
    of: (key) => STATS.weapons[key] ?? {}
  },
  防具: {
    head: ['防具', '部位', 'しゅび', '魔法しゅび', 'そのほか', '特殊効果'],
    align: ['---', ':--:', '---:', '---:', '---', '---'],
    row: (i, d) => [itemLink(i), d.部位 ?? '—', mul(d.しゅび), mul(d.魔法しゅび),
                    ['こうげき', 'HP', 'MP'].filter((k) => d[k]).map((k) => `${k} ${mul(d[k])}`).join('・') || '—',
                    withSpeciesLink(d.特殊効果)],
    of: (key) => STATS.armor[key] ?? {}
  },
  盾: {
    head: ['盾', 'しゅび', '魔法しゅび', '構え中', '適正職業', '特殊効果'],
    align: ['---', '---:', '---:', '---:', '---', '---'],
    row: (i, d) => [itemLink(i), mul(d.しゅび), mul(d.魔法しゅび), mul(d.構え中),
                    jobList(d.職業), withSpeciesLink(d.特殊効果)],
    of: (key) => STATS.shields[key] ?? {}
  },
  アクセサリー: {
    head: ['アクセサリー', 'HP', 'MP', 'こうげき', 'しゅび', '魔法しゅび', 'まりょく', '特殊効果'],
    align: ['---', '---:', '---:', '---:', '---:', '---:', '---:', '---'],
    row: (i, d) => [itemLink(i), ...['HP', 'MP', 'こうげき', 'しゅび', '魔法しゅび', 'まりょく']
      .map((k) => (d[k] ? mul(d[k]) : '—')), withSpeciesLink(d.特殊効果)],
    of: (key) => STATS.accessories[key] ?? {}
  }
}

/** 転生装備は武器・防具・盾・アクセサリーが混ざっているので、種別を見て振り分ける */
function tenseiKind(key) {
  if (STATS.weapons[key]?.こうげき != null || STATS.weapons[key]?.武器種) return '武器'
  if (STATS.armor[key]) return '防具'
  if (STATS.shields[key]) return '盾'
  if (STATS.accessories[key]) return 'アクセサリー'
  return null
}

function table(shape, list) {
  const out = [`| ${shape.head.join(' | ')} |`, `| ${shape.align.join(' | ')} |`]
  for (const i of list) out.push(`| ${shape.row(i, shape.of(i.key)).map(cell).join(' | ')} |`)
  return out
}

/** 手書きで足された行を拾うときの「生成側が知っている名前」。全アイテムと装備ページの種類名 */
const KNOWN_NAMES = () => new Set([...items.map((i) => plainName(i.name)), ...PAGES.map((p) => p.group), ...OTHER_PAGES.map((p) => p.group),
                                   ...RANKS.ores.map((o) => plainName(o.name))])  // 素材ページの「鉱石」の表

function equipPage(page) {
  const list = pick(page.group)
  const path = join(ITEM_DIR, `${page.slug}.md`)
  const extra = extraRows(path, KNOWN_NAMES())
  const emitted = new Set()
  const lines = []
  lines.push('---')
  lines.push(`title: ${page.group}一覧`)
  lines.push(`description: DQMVIの${page.group}${list.length}種のデータ。${page.lead}`)
  lines.push('pageClass: wide-page sortable-list')
  lines.push('---')
  lines.push('')
  lines.push(`# ${page.group}一覧`)
  lines.push('')
  lines.push(`${page.lead}全部で **${list.length}種** です。`)
  lines.push('')
  lines.push('::: tip 見かた')
  lines.push('倍率は、いまの能力に掛かる値です。見出しを押すとその項目で並べ替えできます。')
  lines.push(':::')
  lines.push('')

  if (page.group === '武器') {
    // 武器種はMODが持っている分類。見出しで区切る
    const byKind = new Map()
    for (const i of list) {
      const k = STATS.weapons[i.key]?.武器種 ?? 'その他'
      if (!byKind.has(k)) byKind.set(k, [])
      byKind.get(k).push(i)
    }
    const order = [...WEAPON_ORDER, ...[...byKind.keys()].filter((k) => !WEAPON_ORDER.includes(k))]
    for (const k of order) {
      const group = byKind.get(k)
      if (!group?.length) continue
      lines.push(`## ${k}（${group.length}種）`)
      lines.push('')
      lines.push(...table(k === '杖' ? SHAPE.杖 : SHAPE.武器, group))
      lines.push(...(extra.get(k)?.rows ?? []))
      emitted.add(k)
      lines.push('')
    }
    lines.push(...leftoverTables(extra, emitted))
    lines.push('杖には武器としての攻撃力がなく、「魔力倍率」が呪文の威力にかかります。')
    lines.push('')
  } else if (page.group === '転生装備') {
    const byKind = new Map()
    for (const i of list) {
      const k = tenseiKind(i.key) ?? 'その他'
      if (!byKind.has(k)) byKind.set(k, [])
      byKind.get(k).push(i)
    }
    for (const k of ['武器', '防具', '盾', 'アクセサリー', 'その他']) {
      const group = byKind.get(k)
      if (!group?.length) continue
      lines.push(`## ${k}（${group.length}種）`)
      lines.push('')
      if (SHAPE[k]) lines.push(...table(SHAPE[k], group))
      else for (const i of group) lines.push(`- ${cell(itemLink(i))}`)
      lines.push(...(extra.get(k)?.rows ?? []))
      emitted.add(k)
      lines.push('')
    }
    lines.push(...leftoverTables(extra, emitted))
  } else {
    lines.push(...table(SHAPE[page.group], list))
    lines.push(...(extra.get('')?.rows ?? []))
    lines.push('')
    lines.push(...leftoverTables(extra, emitted))
  }

  lines.push('## 関連ページ')
  lines.push('')
  for (const p of PAGES) if (p.slug !== page.slug) lines.push(`- [${p.group}一覧](/items/${p.slug})`)
  lines.push('- [アイテム一覧（そのほか）](/items/)')
  lines.push('')
  return finish(lines.join('\n'), path)
}

// ── 装備以外の分類ごとのページ ─────────────────────────────
const OTHER = OTHER_PAGES.map((p) => p.group)
function otherTable(head, list, withRank = false) {
  if (withRank) {
    const out = [`| ${head} | ランク | 入手方法 |`, '| --- | :--: | --- |']
    for (const i of list) out.push(`| ${cell(itemLink(i))} | ${rankLabel(materialRank.get(i.key))} | ${cell(sourcesOf(i))} |`)
    return out
  }
  const out = [`| ${head} | 入手方法 |`, '| --- | --- |']
  for (const i of list) out.push(`| ${cell(itemLink(i))} | ${cell(sourcesOf(i))} |`)
  return out
}
function otherPage(page) {
  const list = pick(page.group)
  const path = join(ITEM_DIR, `${page.slug}.md`)
  const extra = extraRows(path, KNOWN_NAMES())
  const emitted = new Set()
  const lines = []
  lines.push('---')
  lines.push(`title: ${page.group}一覧`)
  lines.push(`description: DQMVIの${page.group}${list.length}種の一覧。${page.lead}`)
  lines.push('pageClass: wide-page sortable-list')
  lines.push('---')
  lines.push('')
  lines.push(`# ${page.group}一覧`)
  lines.push('')
  lines.push(`${page.lead}全部で **${list.length}種** です。品名を押すとそのアイテムのページが開きます。`)
  lines.push('')
  if (list.some((i) => DROPPED.has(i.key))) {
    lines.push('入手方法が「モンスター」の品は、品名を押すと落とすモンスターの一覧が開きます。')
    lines.push('')
  }
  if (page.group === '釣り') {
    const byKind = new Map()
    for (const i of list) {
      const k = fishingKind(i.key)
      if (!byKind.has(k)) byKind.set(k, [])
      byKind.get(k).push(i)
    }
    for (const k of ['釣り竿', 'ルアー', '魚', 'そのほか']) {
      const group = byKind.get(k)
      if (!group?.length) continue
      lines.push(`## ${k}（${group.length}種）`)
      lines.push('')
      lines.push(...otherTable(k, group))
      lines.push(...(extra.get(k)?.rows ?? []))
      emitted.add(k)
      lines.push('')
    }
  } else if (page.group === '素材' && materialRank.size) {
    lines.push('「ランク」は、そのランクの土地に湧くモンスターや宝箱から手に入り始める目安です（「1〜」ならランク1から）。ゲーム内の「素材取得一覧表」と同じ数字で、ほかの入手経路もあります。')
    lines.push('')
    lines.push(...otherTable(page.group, list, true))
    lines.push(...(extra.get('')?.rows ?? []))
    lines.push('')
    if (RANKS.ores?.length) {
      lines.push('## 鉱石')
      lines.push('')
      lines.push('そのランクの土地で採れる鉱石と、生成される高さ（Y座標）です。ゲーム内の「鉱石取得一覧表」と同じ内容です。')
      lines.push('')
      lines.push('| 鉱石 | ランク | 深さ |')
      lines.push('| --- | :--: | --- |')
      for (const o of RANKS.ores) lines.push(`| ${cell(o.name)} | ${o.rank} | Y${o.minY} 〜 Y${o.maxY} |`)
      lines.push(...(extra.get('鉱石')?.rows ?? []))
      emitted.add('鉱石')
      lines.push('')
    }
  } else {
    lines.push(...otherTable(page.group, list))
    lines.push(...(extra.get('')?.rows ?? []))
    lines.push('')
  }
  lines.push(...leftoverTables(extra, emitted))
  lines.push('## 関連ページ')
  lines.push('')
  for (const g of page.guide) lines.push(`- ${g}`)
  if (list.some((i) => DROPPED.has(i.key))) lines.push('- [ドロップ品から探す](/drops/)')
  lines.push('- [アイテム一覧](/items/)')
  lines.push('')
  return finish(lines.join('\n'), path)
}

// ── 目次ページ ────────────────────────────────────────────

function indexPage() {
  const others = items.filter((i) => OTHER.includes(i.group)).sort(byGameOrder)
  const path = join(ITEM_DIR, 'index.md')
  const extra = extraRows(path, KNOWN_NAMES())
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
  lines.push(...(extra.get('装備')?.rows ?? []))
  lines.push('')
  lines.push('## そのほか')
  lines.push('')
  lines.push(`装備以外の **${others.length}種** です。分類ごとのページもあります。`)
  lines.push('')
  lines.push('| 分類 | 数 | 中身 |')
  lines.push('| --- | ---: | --- |')
  for (const p of OTHER_PAGES) {
    lines.push(`| [${p.group}](/items/${p.slug}) | ${pick(p.group).length} | ${cell(p.lead)} |`)
  }
  lines.push('')
  lines.push('全部をひとつの表で見るならこちら。見出しを押すと分類ごとや五十音順に並べ替えできます。')
  lines.push('')
  lines.push('| アイテム | 分類 |')
  lines.push('| --- | :--: |')
  for (const i of others) lines.push(`| ${cell(itemLink(i))} | ${cell(i.group)} |`)
  lines.push(...(extra.get('そのほか')?.rows ?? []))
  lines.push('')
  lines.push(...leftoverTables(extra, new Set(['装備', 'そのほか'])))
  lines.push('## 関連ページ')
  lines.push('')
  lines.push('- [アイテムの使い方](/play/items)')
  lines.push('- [鍛冶](/play/smithing) / [農業](/play/farming) / [釣り](/play/fishing)')
  lines.push('')
  return finish(lines.join('\n'), path)
}

// ── 書き出し ──────────────────────────────────────────────
if (!existsSync(ITEM_DIR)) mkdirSync(ITEM_DIR, { recursive: true })
for (const p of PAGES) writeFileSync(join(ITEM_DIR, `${p.slug}.md`), equipPage(p), 'utf8')
for (const p of OTHER_PAGES) writeFileSync(join(ITEM_DIR, `${p.slug}.md`), otherPage(p), 'utf8')
writeFileSync(join(ITEM_DIR, 'index.md'), indexPage(), 'utf8')
const stubs = writeStubs()

console.log(`アイテム: ${items.length}種`)
for (const p of PAGES) console.log(`  ${p.group}: ${pick(p.group).length}`)
console.log(`  そのほか: ${items.filter((i) => OTHER.includes(i.group)).length}（${OTHER_PAGES.map((p) => `${p.group}${pick(p.group).length}`).join('・')}）`)
console.log(`  個別ページ: ${STUB_ITEMS.length}種（新しく作った: ${stubs.made}）、逆引きページ: ${items.length - STUB_ITEMS.length}種`)
for (const a of stubs.adopted) console.log(`  編集者のページを使う: ${a}`)
{
  // 生成側に無いページと、逆引きページができたのに残っている個別ページは、手で確かめる
  const known = new Set(['index', ...PAGES.map((p) => p.slug), ...OTHER_PAGES.map((p) => p.slug), ...STEM.values()])
  for (const f of readdirSync(ITEM_DIR)) {
    if (f.endsWith('.md') && !known.has(f.slice(0, -3))) console.log(`  手書きページ: ${f}（同じ名前の品が無いので、そのまま残す）`)
  }
  for (const i of items) {
    if (DROPPED.has(i.key) && existsSync(join(ITEM_DIR, `${dropSlug(i.key)}.md`))) {
      console.log(`  ${dropSlug(i.key)}.md: 逆引きページ /drops/${dropSlug(i.key)} ができたので、中身を移して消すこと`)
    }
  }
}

// 検索の索引。個別ページが名前だけのあいだは、数値や分類が見える一覧の行へ飛ばすほうが早いので、
// 装備は種類ごとの一覧、そのほかはアイテム一覧を登録する（config.mts は中身の空いたページを
// 候補に出さない。ページに何か書かれた時点でそちらが勝つ）。
// ドロップ品として自分のページを持っているものは、そちらが優先されるので入れない。
{
  const at = new Map([...PAGES, ...OTHER_PAGES].map((p) => [p.group, `/items/${p.slug}`]))
  const seen = new Set()
  recordNames('items', items
    .filter((i) => at.has(i.group) && !DROPPED.has(i.key))
    .filter((i) => !seen.has(i.name) && seen.add(i.name))
    .map((i) => [i.name, at.get(i.group), i.group]))
}

recordCounts({
  items: items.length,
  weapons: pick('武器').length,
  armor: pick('防具').length,
  shields: pick('盾').length,
  accessories: pick('アクセサリー').length,
  tensei: pick('転生装備').length,
  ...Object.fromEntries(OTHER_PAGES.map((p) => [p.slug, pick(p.group).length]))
})
