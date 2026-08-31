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
 *   docs/monsters/index.md  一覧（強さ帯ごと）
 *   docs/bosses/<id>.md     魔王ボス
 *   docs/bosses/index.md    ボス一覧
 *
 * ★MODのバージョンが上がったら、新しいjarを展開して実行し直すだけでよい。
 *   手でページを書き換えると次の再生成で消える。ただし見出し「## 攻略メモ」より
 *   下に書いたものは、再生成しても丸ごと引き継がれる。
 *   ★目印にHTMLコメントは使わないこと。markdown.html:false のため、
 *     本文に書いたコメントはそのまま文字として画面に出てしまう。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SRC = process.argv[2]
if (!SRC) {
  console.error('使い方: node scripts/gen-monster-pages.mjs <展開したassets/dqmviのパス>')
  process.exit(1)
}

const DOCS = 'docs'
const MON_DIR = join(DOCS, 'monsters')
const BOSS_DIR = join(DOCS, 'bosses')
const BIOME_DIR = join(DOCS, 'biomes')

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
 * 逆コンパイルで取り出した追加データ（系統・活動時間・弱点・ドロップ・呪文・出現場所）。
 * 出どころは com.dqm.data.DqmvMonsterListData / DqmvMonsterDexMagicData /
 * DqmvMonsterSpawnPools / DqmvDimensionMonsters。取り出し方は README を参照。
 * ファイルが無ければ、この部分だけ省いて生成する。
 */
const EXTRAS_PATH = join('scripts', 'data', 'monster-extras.json')
let EXTRAS = { monsters: {}, biomes: {} }
if (existsSync(EXTRAS_PATH)) EXTRAS = JSON.parse(readFileSync(EXTRAS_PATH, 'utf8'))
const extrasFor = (id) => EXTRAS.monsters?.[id] ?? null

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
 * assets(TSV) は展開したjarから、追加データと装備データは
 * scripts/extract-*.py が作ったJSONから来る。この3つが違うjarだと、
 * 古い数字と新しい数字が混ざったページができてしまう。
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
    console.error('同じjarで extract-*.py を流し直してから、もう一度実行してください。')
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

/** 日本語名。モンスターは entity ではなくスポーンエッグのアイテム名から引く */
function jpName(id) {
  const raw = lang[`item.dqmvi.${id}_spawn_egg`]
  if (!raw) return id
  return raw.replace(/^DQM\s+/, '').replace(/\s*の?スポーンエッグ$/, '').trim()
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

// ── 1体ぶんのページ ───────────────────────────────────────
function monsterPage(m, { boss }) {
  const name = jpName(m.id)
  const exp = Number(m.dqExperience) || 0
  const gold = Number(m.dqGold) || 0
  const b = bossById.get(m.id)

  const desc = boss
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
    lines.push(`${bandOf(exp).name}のモンスター。`)
  }
  lines.push('')

  // ステータス枠（テーマの ```stats 記法）
  lines.push('## ステータス')
  lines.push('')
  lines.push('```stats')
  lines.push(`HP | ${rnum(m.health)}`)
  lines.push(`MP | ${num(m.maxMp)}`)
  lines.push(`こうげき | ${rnum(m.attackDamage)}`)
  lines.push(`しゅび | ${rnum(m.defense)}`)
  lines.push(`まりょく | ${num(m.magicPower)}`)
  lines.push(`魔法しゅび | ${num(m.magicDefense)}`)
  lines.push(`EXP | ${num(exp)}${boss ? ' !' : ''}`)
  lines.push(`ゴールド | ${num(gold)}`)
  lines.push('```')
  lines.push('')

  // ── 逆コンパイルで判明したデータ ──
  const x = extrasFor(m.id)

  // 生態。図鑑No.だけは全モンスターに付くので、extras が無くてもこの表は出す
  lines.push('## 生態')
  lines.push('')
  lines.push('| 項目 | 内容 |')
  lines.push('| --- | --- |')
  lines.push(`| 図鑑No. | ${m.dexNo} |`)
  if (x?.species) lines.push(`| 系統 | ${cell(x.species)} |`)
  if (x?.dayTime) lines.push(`| 活動時間 | ${cell(x.dayTime)} |`)
  if (x?.weakness) {
    const note = WEAKNESS_NOTE[x.weakness]
    lines.push(`| 弱点 | ${cell(x.weakness)}${note ? `（${note}）` : ''} |`)
  }
  if (x?.rare) lines.push('| レア個体 | レア枠。ふつうの湧きでは出にくい |')
  if (x) lines.push(`| 出現場所 | ${x.places?.length ? x.places.map(cell).join('・') : '通常のバイオーム全域'} |`)
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
      for (const g of x.magic) lines.push(`| ${cell(g.kind)} | ${cell(g.name)} |`)
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
  lines.push(boss ? '- [魔王・ボス一覧](/bosses/)' : '- [モンスター図鑑](/monsters/)')
  lines.push(boss ? '- [モンスター図鑑](/monsters/)' : '- [魔王・ボス一覧](/bosses/)')
  lines.push('- [出現場所から探す](/biomes/)')
  lines.push('')
  lines.push(KEEP_HEADING)
  lines.push('')

  const kept = keptPart(join(boss ? BOSS_DIR : MON_DIR, `${m.id}.md`))
  // 見出しと本文の間は1行空ける（Markdownの体裁）
  return lines.join('\n') + '\n' + (kept || EMPTY_NOTE) + '\n'
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
function tableRows(list, dirOf) {
  const at = typeof dirOf === 'function' ? dirOf : () => dirOf
  // ★先頭の見出しが「No.」の表だけが並べ替えの対象になる（theme/sortable-tables.ts）。
  //   ここの見出しを変えるときは、あちらの SORTABLE_FIRST_HEADER も一緒に直すこと。
  const out = ['| No. | モンスター | 系統 | 弱点 | 時間 | HP | こうげき | しゅび | EXP | G |',
               '| ---: | --- | :--: | :--: | :--: | ---: | ---: | ---: | ---: | ---: |']
  for (const m of list.slice().sort(byDex)) {
    const x = extrasFor(m.id) ?? {}
    out.push(`| ${m.dexNo} | [${cell(jpName(m.id))}](/${at(m)}/${m.id}) | ${cell(x.species ?? '—')} | ${cell(x.weakness ?? '—')} | ${cell((x.dayTime ?? '—').replace('のみ', ''))} | ${rnum(m.health)} | ${rnum(m.attackDamage)} | ${rnum(m.defense)} | ${num(m.dqExperience)} | ${num(m.dqGold)} |`)
  }
  return out
}

function monsterIndex(normals) {
  const lines = []
  lines.push('---')
  lines.push('title: モンスター図鑑')
  lines.push(`description: DQMVIに登場するモンスター${normals.length}体のHP・こうげき・しゅび・経験値・ゴールドの一覧。ゲーム内の図鑑ナンバー順。`)
  lines.push('pageClass: wide-page')
  lines.push('aside: false')
  lines.push('---')
  lines.push('')
  lines.push('# モンスター図鑑')
  lines.push('')
  lines.push(`DQMVIに登場するモンスター **${normals.length}体** を、ゲーム内の図鑑と同じ番号順に並べています。名前を押すと個別ページに移動します。`)
  lines.push('番号が飛んでいるところには魔王クラスのボスが入ります。ボスは [魔王・ボス一覧](/bosses/) にまとめています。')
  lines.push('')
  lines.push('::: tip 探し方')
  lines.push('名前が分かっているときは、右上（スマホは上部）の**検索**にモンスター名を入れるのがいちばん早いです。')
  lines.push('表の見出しを押すと、その項目で並べ替えできます。もう一度押すと逆順になります。')
  lines.push(':::')
  lines.push('')
  lines.push(...tableRows(normals, 'monsters'))
  lines.push('')
  return lines.join('\n')
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
  lines.push(`description: DQMVIの「${b.name}」に出現するモンスター${list.length}体の一覧。系統・弱点・活動時間・ステータスつき。`)
  lines.push('pageClass: wide-page')
  lines.push('---')
  lines.push('')
  lines.push(`# ${b.name}`)
  lines.push('')
  lines.push(`ここに湧く専用のモンスターは **${list.length}体** です。このほかに、どこにでも出る通常のモンスターも湧きます。`)
  lines.push('')
  if (list.length) {
    lines.push(...tableRows(list, (m) => (bossById.has(m.id) ? 'bosses' : 'monsters')))
    lines.push('')
  }
  lines.push('## 関連ページ')
  lines.push('')
  lines.push('- [出現場所から探す](/biomes/)')
  lines.push('- [モンスター図鑑](/monsters/)')
  lines.push('')
  lines.push('## 攻略メモ')
  lines.push('')
  const kept = keptPart(join(BIOME_DIR, `${bid}.md`))
  return lines.join('\n') + '\n' + (kept || EMPTY_NOTE) + '\n'
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
  lines.push('専用のモンスターが決まっている場所の一覧です。ここに載っていないモンスターは、通常のバイオーム全域に湧きます。')
  lines.push('')
  lines.push('| 場所 | 専用モンスター |')
  lines.push('| --- | ---: |')
  for (const [bid, b] of entries) lines.push(`| [${cell(b.name)}](/biomes/${bid}) | ${b.ids.length}体 |`)
  lines.push('')
  lines.push('::: tip 湧く場所が決まっていないモンスター')
  lines.push('MODは「通常」「やや強い」「強い」「レア」といった強さ別のまとまりからも抽選します。')
  lines.push('そちらから湧くモンスターは特定のバイオームに紐づいていないため、この一覧には出てきません。')
  lines.push(':::')
  lines.push('')
  return lines.join('\n')
}

// ── 実行 ──────────────────────────────────────────────────
mkdirSync(MON_DIR, { recursive: true })
mkdirSync(BOSS_DIR, { recursive: true })

const bosses = stats.filter((m) => bossById.has(m.id))
const normals = stats.filter((m) => !bossById.has(m.id))

let written = 0
for (const m of normals) {
  writeFileSync(join(MON_DIR, `${m.id}.md`), monsterPage(m, { boss: false }), 'utf8')
  written++
}
for (const m of bosses) {
  writeFileSync(join(BOSS_DIR, `${m.id}.md`), monsterPage(m, { boss: true }), 'utf8')
  written++
}
writeFileSync(join(MON_DIR, 'index.md'), monsterIndex(normals), 'utf8')
writeFileSync(join(BOSS_DIR, 'index.md'), bossIndex(bosses), 'utf8')

const biomeEntries = Object.entries(EXTRAS.biomes ?? {})
if (biomeEntries.length) {
  mkdirSync(BIOME_DIR, { recursive: true })
  for (const [bid, b] of biomeEntries) {
    writeFileSync(join(BIOME_DIR, `${bid}.md`), biomePage(bid, b, normals, bosses), 'utf8')
  }
  writeFileSync(join(BIOME_DIR, 'index.md'), biomeIndex(biomeEntries), 'utf8')
  console.log(`出現場所:       ${biomeEntries.length}エリア`)
}

console.log(`一般モンスター: ${normals.length}体`)
console.log(`魔王ボス:       ${bosses.length}体`)
console.log(`書き出し:       ${written + 2}ファイル`)
console.log(`図鑑ナンバー:   1〜${Math.max(...stats.map((m) => m.dexNo))}（ボス込みの通し番号）`)
