#!/usr/bin/env node
/**
 * MOD本体のデータから、モンスター1体1ページのMarkdownを生成する。
 *
 *   node scripts/gen-monster-pages.mjs <展開したassets/dqmviのパス>
 *
 * 例:
 *   unzip -o -q DQMVI-0.25.84.jar 'assets/dqmvi/*.tsv' 'assets/dqmvi/lang/*' -d /tmp/dqmvi
 *   node scripts/gen-monster-pages.mjs /tmp/dqmvi/assets/dqmvi
 *
 * ★載せてよいのは「実際にゲームを遊んでいて分かること」だけ。
 *   内部の数値（移動速度・表示倍率・抽選確率・内部ID など）は画面に出ないので載せない。
 *
 * 読むファイル:
 *   monster_stats.tsv  … 全モンスターの数値（並び順が図鑑順）
 *   lang/ja_jp.json    … 日本語名。item.dqmvi.<id>_spawn_egg から引く
 *   boss_ai.tsv        … 魔王ボスの肩書き・フェーズ・行動ローテーション
 *
 * 出すもの:
 *   docs/monsters/<id>.md   一般モンスター
 *   docs/monsters/index.md  一覧（図鑑。「画像」列は /img/monsters/<ID>.png を指し、ビルド時に実物へ差し替わる）
 *   docs/bosses/<id>.md     魔王ボス
 *   docs/bosses/index.md    ボス一覧
 *
 * ★MODのバージョンが上がったら、新しいjarを展開して実行し直すだけでよい。
 *   手でページを書き換えると次の再生成で消える。ただし見出し「## 攻略メモ」より
 *   下に書いたものは、再生成しても丸ごと引き継がれる。
 *   ★目印にHTMLコメントは使わないこと。markdown.html:false のため、
 *     本文に書いたコメントはそのまま文字として画面に出てしまう。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { recordCounts } from './lib/counts.mjs'
import { extraRows, leftoverTables, finish, withExtraSections, mergeHandwrittenPages, plainName } from './lib/handwritten.mjs'
import { fixMonsterName } from './lib/monster-names.mjs'

const SRC = process.argv[2]
if (!SRC) {
  console.error('使い方: node scripts/gen-monster-pages.mjs <展開したassets/dqmviのパス>')
  process.exit(1)
}

const DOCS = 'docs'
const MON_DIR = join(DOCS, 'monsters')
const BOSS_DIR = join(DOCS, 'bosses')
const BIOME_DIR = join(DOCS, 'biomes')
const SPECIES_DIR = join(DOCS, 'species')

/**
 * 系統（スライム系・ドラゴン系…）のページ名。
 * 「ドラゴン系に2倍のダメージ」の装備を拾ったとき、ドラゴン系が何かをすぐ引けるようにする。
 * ★scripts/gen-item-pages.mjs にも同じ対応表がある。片方だけ直さないこと。
 */
const SPECIES_SLUG = new Map([
  ['スライム', 'slime'], ['ドラゴン', 'dragon'], ['悪魔', 'akuma'], ['ゾンビ', 'zombie'],
  ['魔獣', 'majyu'], ['自然', 'sizen'], ['物質', 'bussitu'], ['メタル', 'metal'], ['特殊', 'tokusyu']
])
/** 弱点の短い言い方。系統ページで「よく効く呪文」を出すのに使う */
const WEAKNESS_SHORT = {
  '炎': '炎系', '氷': '氷系', '爆': '爆発系', '風': '風系',
  '強': '呪文が効きにくい', '無敵': '呪文がきかない'
}

/**
 * この見出しより下は、再生成しても書き換えずに引き継ぐ（各ページの手書き部分）。
 * ★HTMLコメントを目印にしてはいけない。markdown.html:false なので
 *   本文中のコメントは画面にそのまま文字として出る。
 */
const KEEP_HEADING = '## 攻略メモ'
/** 中身が無いときに置く文字。これだけの場合は「未記入」とみなす */
const EMPTY_NOTE = '（未記入）'

// ── 読み込み ──────────────────────────────────────────────
function readTsv(path) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/)
  let head = null
  const out = []
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue
    const cols = line.split('\t')
    if (!head) { head = cols; continue }
    out.push(Object.fromEntries(head.map((h, i) => [h, cols[i] ?? ''])))
  }
  return out
}

/**
 * 追加データ（系統・活動時間・弱点・ドロップ・呪文・出現場所）。
 * ★scripts/data/ のJSONは固定データ。作り直す道具は 2026-09-03 に消した（scripts/data/README.md）。
 * ファイルが無ければ、この部分だけ省いて生成する。
 */
const EXTRAS_PATH = join('scripts', 'data', 'monster-extras.json')
let EXTRAS = { monsters: {}, biomes: {} }
if (existsSync(EXTRAS_PATH)) EXTRAS = JSON.parse(readFileSync(EXTRAS_PATH, 'utf8'))
const extrasFor = (id) => EXTRAS.monsters?.[id] ?? null

/** 装備の数値。系統を名指しする装備の数を数えるのに使う。無くても動く */
const EQUIP_PATH = join('scripts', 'data', 'equipment.json')
const EQUIP = existsSync(EQUIP_PATH) ? JSON.parse(readFileSync(EQUIP_PATH, 'utf8')) : {}

/**
 * ドロップ品の表示。飾り（オブジェ・フィギュア）以外は /drops/ の逆引きページに繋ぐ。
 * ★ページ名の作り方は scripts/gen-drop-pages.mjs の slugOf と必ず揃えること。
 */
function dropLink(d) {
  if (/オブジェ|フィギュア/.test(d.item) || !d.key) return cell(d.item)
  const slug = d.key.replace(/^legacy_(item|block)_/, '')
    .replace(/^minecraft:/, 'mc_').replace(/[^A-Za-z0-9_]/g, '_')
  return `[${cell(d.item)}](/drops/${slug})`
}

/**
 * 版ずれの見張り。
 * assets(TSV) は展開したjarから、追加データと装備データは scripts/data/ の固定JSONから来る。
 * この3つが違うjarだと、古い数字と新しい数字が混ざったページができてしまう。
 * バージョンが揃っていなければ、ここで止めて教える。
 */
{
  const version = (s) => String(s ?? '').match(/(\d+\.\d+\.\d+)/)?.[1] ?? null
  const eqPath = join('scripts', 'data', 'equipment.json')
  const seen = new Map()
  if (EXTRAS.jar) seen.set(version(EXTRAS.jar), 'monster-extras.json')
  if (existsSync(eqPath)) {
    const v = version(JSON.parse(readFileSync(eqPath, 'utf8')).jar)
    if (v && !seen.has(v)) seen.set(v, 'equipment.json')
  }
  const fromSrc = version(SRC) ?? version(process.env.DQMVI_JAR)
  if (fromSrc && !seen.has(fromSrc)) seen.set(fromSrc, '展開したassets')
  if (seen.size > 1) {
    console.error('中止: MODのバージョンが揃っていません。')
    for (const [v, where] of seen) console.error(`  ${v}  ← ${where}`)
    console.error('scripts/data/ のJSONは作り直せません（scripts/data/README.md）。assets を同じ版に揃えてください。')
    process.exit(1)
  }
}

const stats = readTsv(join(SRC, 'monster_stats.tsv'))
// monster_stats.tsv の並び順がそのままゲーム内の図鑑順（ファイル先頭の注記より）。
// 行の位置が図鑑ナンバーになる。ボスも一般モンスターと同じ通し番号を使うので、
// 図鑑ページ側では番号がところどころ飛ぶ（そこにボスが入っている）。
stats.forEach((m, i) => { m.dexNo = i + 1 })
/** 図鑑ナンバーの昇順 */
const byDex = (a, b) => a.dexNo - b.dexNo
const bossAi = readTsv(join(SRC, 'boss_ai.tsv'))
const lang = JSON.parse(readFileSync(join(SRC, 'lang', 'ja_jp.json'), 'utf8'))

const bossById = new Map(bossAi.map((b) => [b.id, b]))

// ★数値を伏せるモンスター。ページと一覧には名前だけ残し、中身は「???」で出す。
//   flucifer = 大魔王オン・ゾ・エーグ（図鑑603）。2026-09-02 によっしーが GitHub 上で
//   全項目を ????? に書き換えた（終盤の個体）。再生成で元に戻さないためここに置く。
const HIDDEN = new Set(['flucifer'])
const MASK = '???'
const MASK5 = '?????'

/** 日本語名。モンスターは entity ではなくスポーンエッグのアイテム名から引く（lib/monster-names.mjs の直しを当てる） */
function jpName(id) {
  const raw = lang[`item.dqmvi.${id}_spawn_egg`]
  if (!raw) return fixMonsterName(id, id)
  return fixMonsterName(id, raw.replace(/^DQM\s+/, '').replace(/\s*の?スポーンエッグ$/, '').trim())
}

// ── 図鑑の「画像」列 ─────────────────────────────────────────
/**
 * 行には ![名前](/img/monsters/<ID>.png) と書くだけ。実際に出す画像はビルドのたびに
 * docs/.vitepress/config.mts の findMonsterImage が決める（docs/public/img/monsters/ に
 * <ID>.png か <名前>.png があればそれ、無ければ透明の /img/blank.png で枠だけ。png のほか
 * jpg / jpeg / gif / webp / avif も可）。
 * ★画像を置いて push するだけで次の公開に載る。ここを再生成する必要はない。
 *   （2026-09-03 よっしー「正方形の画像を貼れるスペースだけ作って」→「配置したが表示されない」）
 * ★名前に [ ] が入ると alt が壊れるので外す。数値を伏せるモンスター（HIDDEN）は枠だけ。
 */
const BLANK_IMG = '/img/blank.png'
function imageCell(m) {
  if (HIDDEN.has(m.id)) return `![](${BLANK_IMG})`
  return `![${jpName(m.id).replace(/[\[\]]/g, '')}](/img/monsters/${m.id}.png)`
}

/**
 * 呪文の日本語名。MODは呪文名そのものを持っていないが、
 * 同名の杖・書アイテム（legacy_item_<呪文ID>）に「マヒャドの杖」の形で入っているので
 * そこから「の杖 / の書 / の印」を落として引く。
 */
const SPELL = new Map()
for (const [k, v] of Object.entries(lang)) {
  const m = /^item\.dqmvi\.legacy_item_(.+)$/.exec(k)
  if (m && !SPELL.has(m[1])) SPELL.set(m[1], String(v).replace(/の(杖|書|印|玉|剣)$/, '').trim())
}
const spellName = (id) => SPELL.get(id) ?? id

/**
 * 弱点の意味。Weakness.apply の実装より:
 *   弱点属性の呪文はダメージ2倍 / 「強」は半減 / 「無敵」は0
 */
const WEAKNESS_NOTE = {
  '炎': '炎系の呪文でダメージ2倍',
  '氷': '氷系の呪文でダメージ2倍',
  '爆': '爆発系の呪文でダメージ2倍',
  '風': '風系の呪文でダメージ2倍',
  '強': '呪文ダメージが半分になる',
  '無敵': '呪文ダメージを受けつけない'
}

/** 魔王AIの属性 */
const COLOR = { fire: '炎', ice: '氷', thunder: '雷', dark: '闇', holy: '光' }
const colorName = (c) => COLOR[c] ?? c

// ── 出力用のヘルパ ────────────────────────────────────────
/** 表のセルに入れる。| は表を壊すので全角に逃がす */
const cell = (v) => String(v ?? '').replace(/\|/g, '｜').trim()
const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('en-US') : cell(v)
}
/**
 * HP・こうげき・しゅびは表では四捨五入する。
 * MOD側も図鑑画面で Math.round してから出しているので、それに合わせる。
 */
const rnum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : cell(v)
}

/** 強さの帯。EXPで分ける（jarに系統データが無いため） */
const BANDS = [
  { key: 'beginner', name: '序盤', desc: 'EXP 50未満', max: 50 },
  { key: 'middle',   name: '中盤', desc: 'EXP 50〜199', max: 200 },
  { key: 'late',     name: '終盤', desc: 'EXP 200〜999', max: 1000 },
  { key: 'strong',   name: '強敵', desc: 'EXP 1000以上', max: Infinity }
]
function bandOf(exp) {
  return BANDS.find((b) => exp < b.max) ?? BANDS[BANDS.length - 1]
}

/** 既存ページの「## 攻略メモ」より下を拾う。無ければ空 */
function keptPart(path) {
  if (!existsSync(path)) return ''
  const cur = readFileSync(path, 'utf8')
  const i = cur.indexOf(KEEP_HEADING)
  if (i === -1) return ''
  let body = cur.slice(i + KEEP_HEADING.length)
  // 旧方式の目印と、その頃の穴埋め文が残っていたら取り除く
  body = body
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/（まだありません。気づいたことがあれば書き足してください）/g, '')
    .replace(/^\s*（未記入）\s*$/gm, '')
    .trim()
  return body
}

// ── 出現場所の書き方 ──────────────────────────────────────
// 湧きの処理（DqmvMonsterSpawnPools / DqmvMonsterListData）を読んで確認したこと:
//  ・どのモンスターも、図鑑の「ランク」と同じランクのふつうの土地（DQM以外のバイオーム）に湧く
//  ・DQMのバイオームでは、その場所のランクがモンスターのランク以上になると湧く
//  ・ネザー・果ての世界・海はランクに関係なく湧く
const NO_RANK_PLACES = new Set(['ネザー', '果ての世界', '海'])
function placesCell(x) {
  const parts = []
  if (x.rank) parts.push(`ランク${x.rank}のふつうの土地`)
  for (const p of x.places ?? []) {
    parts.push(!x.rank || x.rank === 1 || NO_RANK_PLACES.has(p) ? cell(p) : `${cell(p)}（ランク${x.rank}以上）`)
  }
  return parts.join('・')
}

// ── 1体ぶんのページ ───────────────────────────────────────
function monsterPage(m, { boss }) {
  const name = jpName(m.id)
  const exp = Number(m.dqExperience) || 0
  const gold = Number(m.dqGold) || 0
  const b = bossById.get(m.id)

  const hidden = HIDDEN.has(m.id)
  const desc = hidden
    ? `DQMVIのモンスター「${name}」のステータス。`
    : boss
      ? `DQMVIの魔王ボス「${name}」の攻略データ。HP${num(m.health)} / 経験値${num(exp)} / ${num(gold)}G。フェーズごとの行動パターンとステータスをまとめています。`
      : `DQMVIのモンスター「${name}」のステータス。HP${num(m.health)} / こうげき${num(m.attackDamage)} / しゅび${num(m.defense)} / 経験値${num(exp)} / ${num(gold)}G。`

  const lines = []
  lines.push('---')
  lines.push(`title: ${name}`)
  lines.push(`description: ${desc}`)
  lines.push('---')
  lines.push('')
  lines.push(`# ${name}`)
  lines.push('')

  if (boss && b) {
    lines.push(`**${cell(b.title)}** ・ ${colorName(b.color)}属性 ・ ${(b.phases || '').trim() ? `${b.phases.split(',').length + 1}フェーズ` : '1フェーズ'}`)
  } else {
    const r = extrasFor(m.id)?.rank
    lines.push(r ? `ランク${r}のモンスター。` : `${bandOf(exp).name}のモンスター。`)
  }
  lines.push('')

  // ステータス枠（テーマの ```stats 記法）
  lines.push('## ステータス')
  lines.push('')
  const v = (val) => (hidden ? MASK5 : val)
  lines.push('```stats')
  lines.push(`HP | ${v(rnum(m.health))}`)
  lines.push(`MP | ${v(num(m.maxMp))}`)
  lines.push(`こうげき | ${v(rnum(m.attackDamage))}`)
  lines.push(`しゅび | ${v(rnum(m.defense))}`)
  lines.push(`まりょく | ${v(num(m.magicPower))}`)
  lines.push(`魔法しゅび | ${v(num(m.magicDefense))}`)
  lines.push(`EXP | ${v(num(exp))}${boss && !hidden ? ' !' : ''}`)
  lines.push(`ゴールド | ${v(num(gold))}`)
  lines.push('```')
  lines.push('')

  // ── 逆コンパイルで判明したデータ ──
  const x = extrasFor(m.id)

  // 生態。図鑑No.だけは全モンスターに付くので、extras が無くてもこの表は出す
  lines.push('## 生態')
  lines.push('')
  lines.push('| 項目 | 内容 |')
  lines.push('| --- | --- |')
  if (hidden) {
    lines.push(`| 図鑑No. | ${MASK} |`)
    if (x?.species) lines.push(`| 系統 | ${MASK} |`)
    if (x?.dayTime) lines.push(`| 活動時間 | ${MASK} |`)
    if (x?.weakness) lines.push(`| 弱点 | ${MASK} |`)
    if (x?.rare) lines.push(`| レア個体 | ${MASK} |`)
  } else {
    lines.push(`| 図鑑No. | ${m.dexNo} |`)
    if (x?.rank) lines.push(`| ランク | ${x.rank} |`)
    if (x?.species) {
      // 系統は同じ系統の一覧に繋ぐ（「ドラゴン系に2倍」の装備を持ったときに辿れる）
      const sp = SPECIES_SLUG.get(x.species)
      lines.push(`| 系統 | ${sp ? `[${cell(x.species)}系](/species/${sp})` : cell(x.species)} |`)
    }
    if (x?.dayTime) lines.push(`| 活動時間 | ${cell(x.dayTime)} |`)
    if (x?.weakness) {
      const note = WEAKNESS_NOTE[x.weakness]
      lines.push(`| 弱点 | ${cell(x.weakness)}${note ? `（${note}）` : ''} |`)
    }
    if (x?.rare) lines.push('| レア個体 | レア枠。ふつうの湧きでは出にくい |')
    // ランクも場所も無い個体（大魔王オン・ゾ・エーグ）は野生の湧きが無いので行ごと出さない
    if (x && (x.rank || x.places?.length)) lines.push(`| 出現場所 | ${placesCell(x)} |`)
  }
  lines.push('')

  if (x) {
    if (x.drops?.length) {
      lines.push('## ドロップ品')
      lines.push('')
      lines.push('| 区分 | アイテム |')
      lines.push('| --- | --- |')
      // ドロップ枠はモンスターごとに数が違う。飾りの「オブジェ」「フィギュア」が
      // 付くのは一部だけなので、あるものだけをそのまま出す。
      // 飾り以外は、そのアイテムを落とす他のモンスターを引ける逆引きページに繋ぐ
      // （ページを作っているのは gen-drop-pages.mjs。飾りにはページが無い）。
      for (const d of x.drops) {
        lines.push(`| ${cell(d.tier)} | ${dropLink(d)} |`)
      }
      lines.push('')
    }

    if (x.magic?.length) {
      lines.push('## 使う呪文')
      lines.push('')
      lines.push('| 種類 | 呪文 |')
      lines.push('| --- | --- |')
      for (const g of x.magic) lines.push(`| ${cell(g.kind)} | ${hidden ? MASK5 : cell(g.name)} |`)
      lines.push('')
    }
  }

  if (boss && b) {
    lines.push('## 行動パターン')
    lines.push('')
    const thresholds = (b.phases || '').split(',').map((s) => s.trim()).filter(Boolean)
    const rots = [b.rot1, b.rot2, b.rot3].filter((r) => r && r.trim())
    rots.forEach((rot, i) => {
      const from = i === 0 ? '100' : thresholds[i - 1]
      const to = thresholds[i] ?? '0'
      lines.push(`### 第${i + 1}フェーズ（HP ${from}%〜${to}%）`)
      lines.push('')
      lines.push('この順番で上から繰り返します。')
      lines.push('')
      rot.split(',').map((s) => s.trim()).filter(Boolean).forEach((act, j) => {
        lines.push(`${j + 1}. ${describeAction(act)}`)
      })
      lines.push('')
    })
    lines.push('::: tip 詠唱と溜めが狙いどころ')
    lines.push('`詠唱` 中は最大HPの8%ぶんのダメージを与えると打ち消せます。守り切られると威力が1.5倍になります。')
    lines.push('`パワー溜め` の直後は大きな隙ができるので、そこで一気に削ります。')
    lines.push(':::')
    lines.push('')
  }

  lines.push('## 関連ページ')
  lines.push('')
  lines.push('- [モンスター図鑑](/monsters/)')
  lines.push('- [出現場所から探す](/biomes/)')
  lines.push('')
  lines.push(KEEP_HEADING)
  lines.push('')

  const path = join(boss ? BOSS_DIR : MON_DIR, `${m.id}.md`)
  const kept = keptPart(path)
  // 見出しと本文の間は1行空ける（Markdownの体裁）
  return withExtraSections(lines.join('\n') + '\n' + (kept || EMPTY_NOTE) + '\n', path)
}

/** boss_ai.tsv の行動記法を日本語にする */
function describeAction(a) {
  const [kind, ...args] = a.split(':')
  const t = {
    wait: '様子見（隙ができる）',
    wave: 'いてつくはどう（こちらの強化を消す）',
    shockwave: '衝撃波',
    roar: '咆哮'
  }[kind]
  if (t) return t
  if (kind === 'spell') return `呪文 **${spellName(args[0])}**`
  if (kind === 'cast') return `詠唱 **${spellName(args[0])}**（${args[1]}秒・打ち消し可）`
  if (kind === 'charge') return `パワー溜め（${args[0]}秒・次の一手が1.6倍）`
  if (kind === 'meteor') return `メテオ ${args[0]}発`
  if (kind === 'pillar') return `${colorName(args[0])}属性の柱 ${args[1]}本`
  if (kind === 'summon') return `**${jpName(args[0])}** を ${args[1]}体 召喚`
  if (kind === 'heal') return `自己回復（最大HPの${args[0]}%）`
  if (kind === 'retreat') return `後退して回復（HP${args[0]}%ぶん・追撃のチャンス）`
  if (kind === 'barrier') return `防壁を張る（${{ crack: '打撃に強くなる', physical: '物理に強くなる', magic: '呪文に強くなる' }[args[0]] ?? args[0]}・${args[1]}）`
  if (kind === 'dome') return `結界ドームに籠もる（${args[0]}秒・無敵）`
  if (kind === 'cage') return `一番近い相手を檻に閉じ込める（${args[0]}秒・壊して脱出可）`
  return `\`${a}\``
}

// ── 一覧ページ ────────────────────────────────────────────
function tableRows(list, dirOf, { image = false } = {}) {
  const at = typeof dirOf === 'function' ? dirOf : () => dirOf
  // ★先頭の見出しが「No.」の表だけが並べ替えの対象になる（theme/sortable-tables.ts）。
  //   ここの見出しを変えるときは、あちらの SORTABLE_FIRST_HEADER も一緒に直すこと。
  //   「画像」の列（図鑑だけ。image: true）も、あちらの IMAGE_HEADER と同じ文字にしておくこと
  //   （並べ替えの対象から外し、名前の列と一緒に左に固定するための目印）。
  const head = image ? '| No. | 画像 | モンスター |' : '| No. | モンスター |'
  const rule = image ? '| ---: | :--: | --- |' : '| ---: | --- |'
  const out = [`${head} ランク | 系統 | 弱点 | 時間 | HP | こうげき | しゅび | EXP | G |`,
               `${rule} :--: | :--: | :--: | :--: | ---: | ---: | ---: | ---: | ---: |`]
  for (const m of list.slice().sort(byDex)) {
    const x = extrasFor(m.id) ?? {}
    const pic = image ? ` ${imageCell(m)} |` : ''
    if (HIDDEN.has(m.id)) {
      out.push(`| ${MASK} |${pic} [${cell(jpName(m.id))}](/${at(m)}/${m.id}) | ${MASK} | ${MASK} | ${MASK} | ${MASK} | ${MASK} | ${MASK} | ${MASK} | ${MASK} | ${MASK} |`)
      continue
    }
    out.push(`| ${m.dexNo} |${pic} [${cell(jpName(m.id))}](/${at(m)}/${m.id}) | ${x.rank ?? '—'} | ${cell(x.species ?? '—')} | ${cell(x.weakness ?? '—')} | ${cell((x.dayTime ?? '—').replace('のみ', ''))} | ${rnum(m.health)} | ${rnum(m.attackDamage)} | ${rnum(m.defense)} | ${num(m.dqExperience)} | ${num(m.dqGold)} |`)
  }
  return out
}

function monsterIndex(normals) {
  const lines = []
  lines.push('---')
  lines.push('title: モンスター図鑑')
  // ★文面はよっしーが 2026-09-05 に GitHub 上で直したもの（379bb09）。数（586体）と欠番の断りを消し、ランクの説明を短く
  lines.push('description: DQMVIに登場するモンスターのランク・HP・こうげき・しゅび・経験値・ゴールドの一覧。')
  // monster-dex … 図鑑の表の上に絞り込みボタンを出す目印（theme/dex-filter.ts）
  lines.push('pageClass: wide-page monster-dex')
  lines.push('aside: false')
  lines.push('---')
  lines.push('')
  lines.push('# モンスター図鑑')
  lines.push('')
  lines.push('DQMVIに登場するモンスターを、ゲーム内の図鑑と同じ番号順に並べています。名前を押すと個別ページに移動します。')
  lines.push('')
  lines.push('**ランク**は図鑑画面の「ランク」と同じ数字です。ランク3のモンスターは、ランク3になったバイオームに湧きます。')
  lines.push('')
  lines.push('::: tip 探し方')
  lines.push('名前が分かっているときは、右上（スマホは上部）の**検索**にモンスター名を入れるのがいちばん早いです。')
  lines.push('表の上のボタンで、ランクや種類（雑魚・転生・ボス）で絞り込めます。')
  lines.push('表の見出しを押すと、その項目で並べ替えできます。もう一度押すと逆順になります。')
  lines.push(':::')
  lines.push('')
  const path = join(MON_DIR, 'index.md')
  // 図鑑だけ「画像」の列がある（No. | 画像 | モンスター …）ので、名前は3列目
  const extra = extraRows(path, new Set(normals.map((m) => plainName(jpName(m.id)))), { nameCol: 2, nameHeader: 'モンスター', header: '| No.' })
  lines.push(...tableRows(normals, 'monsters', { image: true }))
  lines.push(...(extra.get('')?.rows ?? []))
  lines.push('')
  lines.push(...leftoverTables(extra, new Set()))
  return finish(lines.join('\n'), path)
}

function bossIndex(bosses) {
  const lines = []
  lines.push('---')
  lines.push('title: 魔王・ボス一覧')
  lines.push(`description: DQMVIの魔王・ボス${bosses.length}体の攻略データ。HP・経験値・フェーズ数・行動パターンの一覧。`)
  lines.push('pageClass: wide-page')
  lines.push('---')
  lines.push('')
  lines.push('# 魔王・ボス一覧')
  lines.push('')
  lines.push(`専用の行動パターン（魔王AI）を持つ **${bosses.length}体** を、ゲーム内の図鑑と同じ番号順に並べています。フェーズごとに戦い方が変わります。`)
  lines.push('通常のモンスターは [モンスター図鑑](/monsters/) にまとめています。')
  lines.push('')
  lines.push('| No. | ボス | 肩書き | 属性 | フェーズ | HP | EXP | G |')
  lines.push('| ---: | --- | --- | :--: | :--: | ---: | ---: | ---: |')
  for (const m of bosses.slice().sort(byDex)) {
    const b = bossById.get(m.id)
    const phases = (b?.phases || '').trim() ? b.phases.split(',').length + 1 : 1
    lines.push(`| ${m.dexNo} | [${cell(jpName(m.id))}](/bosses/${m.id}) | ${cell(b?.title)} | ${colorName(b?.color)} | ${phases} | ${num(m.health)} | ${num(m.dqExperience)} | ${num(m.dqGold)} |`)
  }
  lines.push('')
  lines.push('## 行動の読み方')
  lines.push('')
  lines.push('| 表記 | 意味 |')
  lines.push('| --- | --- |')
  lines.push('| いてつくはどう | こちらにかけた強化を全部消される |')
  lines.push('| 詠唱 | 最大HPの8%ぶんダメージを与えると打ち消せる。守り切られると威力1.5倍 |')
  lines.push('| パワー溜め | 次の一手が1.6倍。終わった直後に大きな隙ができる |')
  lines.push('| 後退して回復 | 追撃のチャンス |')
  lines.push('| 結界ドーム | 籠もっている間は無敵 |')
  lines.push('')
  return lines.join('\n')
}

// ── 出現場所のページ ──────────────────────────────────────
function biomePage(bid, b, normals, bosses) {
  const known = new Set(b.ids)
  const list = [...normals, ...bosses].filter((m) => known.has(m.id))
  const lines = []
  lines.push('---')
  lines.push(`title: ${b.name}`)
  lines.push(`description: DQMVIの「${b.name}」に出現するモンスター${list.length}体の一覧。ランク・系統・弱点・活動時間・ステータスつき。`)
  lines.push('pageClass: wide-page')
  lines.push('---')
  lines.push('')
  lines.push(`# ${b.name}`)
  lines.push('')
  lines.push(`ここに湧くモンスターは **${list.length}体** です。` + (NO_RANK_PLACES.has(b.name)
    ? '土地のランクに関係なく湧きます。'
    : 'この場所のランク（バイオーム名の横に出る数字）が、それぞれの「ランク」以上になると湧きます。まだ1体も条件を満たさないうちは、ふつうの土地と同じモンスターが湧きます。'))
  lines.push('')
  const path = join(BIOME_DIR, `${bid}.md`)
  const extra = extraRows(path, new Set(list.map((m) => plainName(jpName(m.id)))), { nameCol: 1, nameHeader: 'モンスター', header: '| No.' })
  if (list.length) {
    lines.push(...tableRows(list, (m) => (bossById.has(m.id) ? 'bosses' : 'monsters')))
    lines.push(...(extra.get('')?.rows ?? []))
    lines.push('')
  }
  lines.push(...leftoverTables(extra, new Set()))
  lines.push('## 関連ページ')
  lines.push('')
  lines.push('- [出現場所から探す](/biomes/)')
  lines.push('- [モンスター図鑑](/monsters/)')
  lines.push('')
  lines.push('## 攻略メモ')
  lines.push('')
  const kept = keptPart(path)
  return withExtraSections(lines.join('\n') + '\n' + (kept || EMPTY_NOTE) + '\n', path)
}

function biomeIndex(entries) {
  const lines = []
  lines.push('---')
  lines.push('title: 出現場所から探す')
  lines.push('description: DQMVIのオリジナルバイオーム・ネザー・果ての世界・海に、それぞれどのモンスターが湧くかの一覧。')
  lines.push('---')
  lines.push('')
  lines.push('# 出現場所から探す')
  lines.push('')
  lines.push('湧くモンスターが決まっている場所の一覧です。ここに載っていないふつうの土地には、その土地と同じランクのモンスターが湧きます。')
  lines.push('')
  lines.push('| 場所 | 湧くモンスター |')
  lines.push('| --- | ---: |')
  for (const [bid, b] of entries) lines.push(`| [${cell(b.name)}](/biomes/${bid}) | ${b.ids.length}体 |`)
  const path = join(BIOME_DIR, 'index.md')
  const extra = extraRows(path, new Set(entries.map(([, b]) => plainName(b.name))))
  lines.push(...(extra.get('')?.rows ?? []))
  lines.push('')
  lines.push(...leftoverTables(extra, new Set()))
  lines.push('::: tip ふつうの土地に湧くモンスター')
  lines.push('図鑑の「ランク」が、その土地のランク（バイオーム名の横に出る数字）と同じモンスターが湧きます。')
  lines.push('上の場所に載っているモンスターも、同じランクのふつうの土地には湧きます。ランクは[モンスター図鑑](/monsters/)の表で並べ替えられます。')
  lines.push(':::')
  lines.push('')
  return finish(lines.join('\n'), path)
}

// ── 実行 ──────────────────────────────────────────────────

/** その系統でいちばん多い弱点と活動時間を数える。手で書くと必ず実態とずれるため */
function speciesTrend(list) {
  const count = (pick) => {
    const c = new Map()
    for (const m of list) {
      const v = pick(extrasFor(m.id) ?? {})
      if (v) c.set(v, (c.get(v) ?? 0) + 1)
    }
    return [...c.entries()].sort((a, b) => b[1] - a[1])
  }
  const weak = count((x) => x.weakness)
  const time = count((x) => x.dayTime)
  // 過半数に届かないときは「主な傾向」とは言わない。無理にまとめると嘘になる
  const say = (top, total, label) => {
    if (!top) return '—'
    const [name, n] = top
    const text = label ? (label[name] ?? name) : name
    if (n === total) return `${text}（全部）`
    if (n * 2 <= total) return `${text}（${n}/${total}体・ばらつきあり）`
    return `${text}（${n}/${total}体）`
  }
  return {
    weakness: say(weak[0], list.length, WEAKNESS_SHORT),
    dayTime: say(time[0], list.length)
  }
}

/** その系統を名指しする装備の数（「ドラゴン系に2倍のダメージ」など） */
function speciesGear(name) {
  let n = 0
  for (const sec of ['weapons', 'armor', 'shields', 'accessories']) {
    for (const v of Object.values(EQUIP[sec] ?? {})) {
      if (typeof v?.特殊効果 === 'string' && v.特殊効果.includes(`${name}系`)) n++
    }
  }
  return n
}
// ── 系統のページ ──────────────────────────────────────────
function speciesPage(name, list) {
  const slug = SPECIES_SLUG.get(name) ?? name
  const lines = []
  lines.push('---')
  lines.push(`title: ${name}系`)
  lines.push(`description: DQMVIの${name}系モンスター${list.length}体の一覧。弱点・活動時間・ステータスつき。`)
  lines.push('pageClass: wide-page')
  lines.push('aside: false')
  lines.push('---')
  lines.push('')
  lines.push(`# ${name}系`)
  lines.push('')
  const t = speciesTrend(list)
  const gear = speciesGear(name)
  lines.push(`${name}系のモンスターは **${list.length}体** です。`)
  lines.push('')
  lines.push('| 傾向 | 内容 |')
  lines.push('| --- | --- |')
  lines.push(`| 弱点の傾向 | ${cell(t.weakness)} |`)
  lines.push(`| 活動時間 | ${cell(t.dayTime)} |`)
  if (gear) lines.push(`| この系統に強い装備 | ${gear}種（「${name}系に2倍」など） |`)
  lines.push('')
  const path = join(SPECIES_DIR, `${slug}.md`)
  const extra = extraRows(path, new Set(list.map((m) => plainName(jpName(m.id)))), { nameCol: 1, nameHeader: 'モンスター', header: '| No.' })
  lines.push(...tableRows(list, (m) => (bossById.has(m.id) ? 'bosses' : 'monsters')))
  lines.push(...(extra.get('')?.rows ?? []))
  lines.push('')
  lines.push(...leftoverTables(extra, new Set()))
  lines.push('## 関連ページ')
  lines.push('')
  lines.push('- [系統から探す](/species/)')
  lines.push('- [モンスター図鑑](/monsters/)')
  lines.push('- [ドロップ品から探す](/drops/)')
  lines.push('')
  lines.push(KEEP_HEADING)
  lines.push('')
  const kept = keptPart(path)
  return withExtraSections(lines.join('\n') + (kept ? `\n${kept}\n` : `\n${EMPTY_NOTE}\n`), path)
}

function speciesIndex(groups) {
  const lines = []
  lines.push('---')
  lines.push('title: 系統から探す')
  lines.push(`description: DQMVIのモンスターを系統（スライム系・ドラゴン系など${groups.length}種）で分けた一覧。`)
  lines.push('---')
  lines.push('')
  lines.push('# 系統から探す')
  lines.push('')
  lines.push('モンスターは **' + groups.length + '種類の系統** に分かれています。')
  lines.push('「ドラゴン系に2倍のダメージ」のような装備を手に入れたとき、その系統がどれかをここで引けます。')
  lines.push('')
  lines.push('| 系統 | 数 | 弱点の傾向 | 活動時間 | 強い装備 |')
  lines.push('| --- | ---: | --- | :--: | ---: |')
  for (const [name, list] of groups) {
    const t = speciesTrend(list)
    const gear = speciesGear(name)
    lines.push(`| [${cell(name)}系](/species/${SPECIES_SLUG.get(name) ?? name}) | ${list.length} | ${cell(t.weakness)} | ${cell(t.dayTime)} | ${gear || '—'} |`)
  }
  const path = join(SPECIES_DIR, 'index.md')
  const extra = extraRows(path, new Set(groups.map(([name]) => `${plainName(name)}系`)))
  lines.push(...(extra.get('')?.rows ?? []))
  lines.push('')
  lines.push(...leftoverTables(extra, new Set()))
  lines.push('## 関連ページ')
  lines.push('')
  lines.push('- [モンスター図鑑](/monsters/)')
  lines.push('- [出現場所から探す](/biomes/)')
  lines.push('- [ドロップ品から探す](/drops/)')
  lines.push('')
  return finish(lines.join('\n'), path)
}

mkdirSync(MON_DIR, { recursive: true })

// ★魔王ボス（boss_ai.tsv に載っている個体）はページを作らない。
//   終盤の筋書きに直結するネタバレのため（2026-09-02 よっしー指示「ボスモンスターの情報全削除」）。
//   図鑑・出現場所・系統・ドロップ逆引きのどこにも出さない。番号は振り直さない。
const bosses = stats.filter((m) => bossById.has(m.id))
const normals = stats.filter((m) => !bossById.has(m.id))

let written = 0
for (const m of normals) {
  writeFileSync(join(MON_DIR, `${m.id}.md`), monsterPage(m, { boss: false }), 'utf8')
  written++
}
writeFileSync(join(MON_DIR, 'index.md'), monsterIndex(normals), 'utf8')

// ── 手書きで足されたページを正式なページに統合する ──────────
// 編集者は MOD のデータを取り込めないので、新しいモンスターを見つけたら
// 図鑑の数字を写した仮のページを作ってよいことにしている（/guide/edit）。
// 次にここを走らせたとき、同じ名前の正式なページに攻略メモを引き継いで、仮ページを消す。
mergeHandwrittenPages(MON_DIR, normals.map((m) => [jpName(m.id), m.id]))

const biomeEntries = Object.entries(EXTRAS.biomes ?? {})
if (biomeEntries.length) {
  mkdirSync(BIOME_DIR, { recursive: true })
  for (const [bid, b] of biomeEntries) {
    writeFileSync(join(BIOME_DIR, `${bid}.md`), biomePage(bid, b, normals, []), 'utf8')
  }
  writeFileSync(join(BIOME_DIR, 'index.md'), biomeIndex(biomeEntries), 'utf8')
  mergeHandwrittenPages(BIOME_DIR, biomeEntries.map(([bid, b]) => [b.name, bid]), '手書きの出現場所')
  console.log(`出現場所:       ${biomeEntries.length}エリア`)
}

// 系統ごとのページ（ボスは入れない）
{
  const groups = new Map()
  for (const m of normals) {
    const sp = extrasFor(m.id)?.species
    if (!sp) continue
    if (!groups.has(sp)) groups.set(sp, [])
    groups.get(sp).push(m)
  }
  const entries = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)
  if (entries.length) {
    mkdirSync(SPECIES_DIR, { recursive: true })
    for (const [name, list] of entries) {
      writeFileSync(join(SPECIES_DIR, `${SPECIES_SLUG.get(name) ?? name}.md`), speciesPage(name, list), 'utf8')
    }
    writeFileSync(join(SPECIES_DIR, 'index.md'), speciesIndex(entries), 'utf8')
    console.log(`系統:           ${entries.length}種`)
  }
}

console.log(`一般モンスター: ${normals.length}体`)
console.log(`魔王ボス:       ${bosses.length}体（ページは作らない）`)
console.log(`書き出し:       ${written + 1}ファイル`)
console.log(`図鑑ナンバー:   1〜${Math.max(...stats.map((m) => m.dexNo))}（ボス込みの通し番号）`)

recordCounts({
  monsters: normals.length,
  biomes: Object.keys(EXTRAS.biomes ?? {}).length,
  species: new Set(normals.map((m) => extrasFor(m.id)?.species).filter(Boolean)).size
})
