#!/usr/bin/env node
/**
 * ゲーム内の「導きの書」から、呪文・特技・遊び方のページを作る。
 *
 *   node scripts/gen-guide-pages.mjs <MODを展開した ext/assets/dqmvi のパス>
 *
 * ★導きの書はゲーム内でプレイヤーが読めるヘルプそのものなので、
 *   ここに書いてあることは全部「遊んでいて分かること」にあたる。
 *
 * 読むファイル:
 *   gambits.tsv         … ガンビットで選べる 対象・条件・行動 の一覧
 *   gambit_presets.tsv  … あらかじめ用意された作戦の型。ルールは
 *                         「対象|条件1|条件2|行動|引数」を ; でつないだ形
 *   adventure_guide.tsv … id / 解放段階 / 大分類 / 小分類 / タイトル / 本文
 *                         本文の改行は ⏎、1行の中の区切りは " / "
 *                         「消費MP: 2 / 基本威力: 8 / 範囲: 単体」のように
 *                         「項目: 値」の形で書かれている行は表の列に振り分ける。
 *
 * 書き出すファイル:
 *   docs/spells/index.md  呪文一覧
 *   docs/skills/index.md  特技一覧
 *   docs/play/*.md        遊び方ガイド（大分類ごとに1ページ）
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SRC = process.argv[2]
if (!SRC) {
  console.error('使い方: node scripts/gen-guide-pages.mjs <ext/assets/dqmvi のパス>')
  process.exit(1)
}

const DOCS = 'docs'

// ── 読み込み ──────────────────────────────────────────────
/** 導きの書を読む。#で始まる行と空行は読み飛ばす */
function readGuide(path) {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const [id, stage, major, minor, title, ...rest] = l.split('\t')
      return { id, stage, major, minor, title, body: rest.join('\t') ?? '' }
    })
    .filter((e) => e.major && e.title)
}

/**
 * 本文を「項目: 値」の組と、それ以外の説明文に分ける。
 *   "消費MP: 10 / 武器: 剣⏎効果: 炎属性の1.5倍ダメージ⏎Shift+左クリックで発動する。"
 *     → fields { 消費MP: '10', 武器: '剣', 効果: '炎属性の1.5倍ダメージ' }
 *       text   'Shift+左クリックで発動する。'
 */
function parseBody(body) {
  const fields = {}
  const text = []
  for (const line of String(body).split('⏎')) {
    for (const part of line.split(' / ')) {
      const seg = part.trim()
      if (!seg) continue
      const m = /^([^:：]{1,10})[:：]\s*(.+)$/.exec(seg)
      if (m) fields[m[1].trim()] = m[2].trim()
      else text.push(seg)
    }
  }
  return { fields, text: text.join(' ') }
}

const guide = readGuide(join(SRC, 'adventure_guide.tsv'))

/** タブ区切りを、1行目を見出しとして読む */
function readTable(path) {
  const rows = readFileSync(path, 'utf8').split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'))
  const [head, ...body] = rows
  return body.map((c) => Object.fromEntries(head.map((h, i) => [h, c[i] ?? ''])))
}

const gambits = readTable(join(SRC, 'gambits.tsv'))
const presets = readTable(join(SRC, 'gambit_presets.tsv'))
/** 「type:id」→ 表示名。プリセットのルールを日本語に直すのに使う */
const gambitName = new Map(gambits.map((g) => [`${g.type}:${g.id}`, g.name]))
/** どの種類にあるか分からない語も引けるように、id だけでも引けるようにする */
const gambitById = new Map(gambits.map((g) => [g.id, g.name]))
const gname = (type, id) => (id ? gambitName.get(`${type}:${id}`) ?? gambitById.get(id) ?? id : '')

// ── 書き出しの部品 ────────────────────────────────────────
const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim() || '—'
/**
 * 小分類から系統名を取り出す。
 *   「攻撃呪文(炎)」→ 炎    かっこの中を使う
 *   「回復呪文」   → 回復   かっこが無ければ末尾の「呪文」を落とす
 */
const inner = (s) =>
  /[（(]([^）)]+)[）)]/.exec(s ?? '')?.[1] ?? String(s ?? '').replace(/呪文$/, '')

function frontmatter(title, description, extra = []) {
  return ['---', `title: ${title}`, `description: ${description}`, ...extra, '---', '']
}

// ── 呪文一覧 ──────────────────────────────────────────────
function spellsPage() {
  const list = guide.filter((e) => e.major === '呪文')
    .map((e) => ({ ...e, ...parseBody(e.body), kind: inner(e.minor) }))

  const lines = []
  lines.push(...frontmatter('呪文一覧',
    `DQMVIで使える呪文${list.length}種の一覧。消費MP・威力・範囲・系統でくらべられます。`,
    ['pageClass: wide-page sortable-list']))
  lines.push('# 呪文一覧')
  lines.push('')
  lines.push(`ゲーム内の「導きの書」に載っている呪文 **${list.length}種** です。`)
  lines.push('')
  lines.push('::: tip 見かた')
  lines.push('見出しを押すと、その項目で並べ替えできます。消費MPの安い順や、威力の高い順に見られます。')
  lines.push(':::')
  lines.push('')
  lines.push('| 呪文 | 系統 | 消費MP | 威力 | 回復量 | 範囲 |')
  lines.push('| --- | :--: | ---: | ---: | ---: | :--: |')
  for (const s of list) {
    const f = s.fields
    lines.push(`| ${cell(s.title)} | ${cell(s.kind)} | ${cell(f['消費MP'])} | ${cell(f['基本威力'])} | ${cell(f['基本回復量'])} | ${cell(f['範囲'])} |`)
  }
  lines.push('')

  // 効果の説明文は系統ごとに共通で、そのまま列にすると同じ文が何十行も並ぶ。
  // 系統をまとめて注記として出す。
  // 表に列を作らなかった項目（即死率など）を持つ呪文は、系統でまとめず名前を出す
  const special = list.filter((s) => Object.keys(s.fields).some(
    (k) => !['消費MP', '基本威力', '基本回復量', '範囲'].includes(k)))
  const byText = new Map()
  for (const s of list) {
    if (!s.text || special.includes(s)) continue
    if (!byText.has(s.text)) byText.set(s.text, new Set())
    byText.get(s.text).add(s.kind)
  }
  if (byText.size || special.length) {
    lines.push('## 効果の決まり方')
    lines.push('')
    for (const [text, kinds] of byText) {
      lines.push(`- **${[...kinds].join('・')}** … ${text}`)
    }
    for (const s of special) {
      const extra = Object.entries(s.fields)
        .filter(([k]) => !['消費MP', '基本威力', '基本回復量', '範囲'].includes(k))
        .map(([k, v]) => `${k} ${v}`).join('・')
      lines.push(`- **${s.title}** … ${extra}。${s.text}`)
    }
    lines.push('')
  }
  lines.push('## 関連ページ')
  lines.push('')
  lines.push('- [特技一覧](/skills/)')
  lines.push('- [職業一覧](/jobs/)')
  lines.push('- [モンスター図鑑](/monsters/)')
  lines.push('')
  return lines.join('\n')
}

// ── 特技一覧 ──────────────────────────────────────────────
function skillsPage() {
  const list = guide.filter((e) => e.major === '特技')
    .map((e) => ({ ...e, ...parseBody(e.body), weapon: inner(e.minor) }))

  const lines = []
  lines.push(...frontmatter('特技一覧',
    `DQMVIで使える特技${list.length}種の一覧。武器・消費MP・効果・習得する職業とレベル。`,
    ['pageClass: wide-page sortable-list']))
  lines.push('# 特技一覧')
  lines.push('')
  lines.push(`ゲーム内の「導きの書」に載っている特技 **${list.length}種** です。`)
  lines.push('')
  const how = list.map((s) => s.text).find((t) => t && t.includes('クリック'))
  lines.push('::: tip 使いかた')
  if (how) lines.push(how.replace(/。$/, 'ので、その武器を持っている必要があります。'))
  lines.push('見出しを押すと、その項目で並べ替えできます。武器ごとや消費MPの安い順に見られます。')
  lines.push(':::')
  lines.push('')
  lines.push('| 特技 | 武器 | 消費MP | 効果 | 習得 |')
  lines.push('| --- | :--: | ---: | --- | --- |')
  for (const s of list) {
    const f = s.fields
    lines.push(`| ${cell(s.title)} | ${cell(f['武器'] ?? s.weapon)} | ${cell(f['消費MP'])} | ${cell(f['効果'])} | ${cell(f['習得'])} |`)
  }
  lines.push('')
  lines.push('## 関連ページ')
  lines.push('')
  lines.push('- [呪文一覧](/spells/)')
  lines.push('- [職業一覧](/jobs/)')
  lines.push('')
  return lines.join('\n')
}

// ── 遊び方ガイド ──────────────────────────────────────────
/**
 * 大分類ごとの1ページ。URLに使う名前と、ページの説明。
 * ガンビットだけは分量があるので、ペットとは別のページに切り出す。
 */
const PLAY = [
  { major: 'はじめに', slug: 'start', lead: 'ゲームを始めて最初にすることと、モンスターポートの使い方。' },
  { major: '冒険のきほん', slug: 'basics', lead: 'ステータスの見かた、戦い方、死んだときの扱い、便利な操作。' },
  { major: 'ペットと配合', slug: 'pets', lead: 'モンスターを仲間にして、育てて、配合するまで。', exclude: ['ガンビット'] },
  { major: 'ペットと配合', slug: 'gambit', lead: 'ペットに戦い方を指示するガンビットの組み方。', only: ['ガンビット'], title: 'ガンビット' },
  { major: '職業', slug: 'jobs', lead: '転職のしかたと、サブ職業のしくみ。', exclude: ['職業一覧'] },
  { major: 'アイテム', slug: 'items', lead: '素材・種・道具・特殊効果のある武具について。' },
  { major: '鍛冶', slug: 'smithing', lead: '装備を打つときの目押し、品質、強化と分解。' },
  { major: '農業', slug: 'farming', lead: '種のまき方、収穫のコツ、交配。' },
  { major: '釣り', slug: 'fishing', lead: '釣りの始め方、取り込み、ヌシと魚交換所。' },
  { major: '施設と暮らし', slug: 'facilities', lead: '拠点づくり、お店、ダンジョンと遊び場。' },
  { major: 'クエスト', slug: 'quests', lead: 'メインクエストと、町の人やお店からの依頼。' }
]

/** その大分類のうち、このページに載せる項目を小分類の順に並べる */
function entriesFor(page) {
  const list = guide.filter((e) => e.major === page.major
    && !(page.exclude ?? []).includes(e.minor)
    && (!page.only || page.only.includes(e.minor)))
  // 同じ小分類がファイル内で離れて出てくるのでまとめる。順番は最初に出た位置
  const groups = new Map()
  for (const e of list) {
    if (!groups.has(e.minor)) groups.set(e.minor, [])
    groups.get(e.minor).push(e)
  }
  return groups
}

/**
 * 導きの書に書かれていないが、ゲーム内の画面を見れば分かることの補足。
 *
 * ★ここに書けるのは「プレイヤーが画面で確認できること」だけ。
 *   配合については、モンスター1体ごとのランクや系統の数値も取り出せるが、
 *   一覧で公開しないと決めた（2026-08-31 よっしー判断）。
 *   区分（開発上の内部の分類）は画面に出ないので載せない。
 */
const EXTRA = {
  pets: [
    '## 配合の仕組み',
    '',
    '子どもの候補は **親2匹のランクと系統** から決まります。',
    '候補はひとつに定まらず、そこから **確率で抽選** されます。',
    '',
    '配合画面には候補とその確率が並ぶので、決める前に何が生まれうるか確かめられます。',
    'ランクも配合画面に出ます。配合を重ねるほど高いランクに手が届きます。',
    '',
    '- 継承する魔法は、親Aと親Bから **最大5つ** まで選べます',
    '- 実行すると親2匹は消えます。装備していたものはインベントリに戻ります',
    '- 転生では見た目が親Aのまま変わらず、能力だけ引き継ぎます',
    ''
  ]
}

function playPage(page) {
  const groups = entriesFor(page)
  const count = [...groups.values()].reduce((n, g) => n + g.length, 0)
  const title = page.title ?? page.major

  const lines = []
  lines.push(...frontmatter(title, `DQMVIの${title}について。${page.lead}`, ['outline: 2']))
  lines.push(`# ${title}`)
  lines.push('')
  lines.push(page.lead)
  lines.push('')
  if (page.slug === 'jobs') {
    lines.push('18種それぞれの能力や習得スキルは [職業一覧](/jobs/) にまとめています。')
    lines.push('')
  }
  for (const [minor, items] of groups) {
    lines.push(`## ${minor}`)
    lines.push('')
    for (const e of items) {
      lines.push(`### ${e.title}`)
      lines.push('')
      for (const para of String(e.body).split('⏎').map((t) => t.trim()).filter(Boolean)) {
        lines.push(para)
        lines.push('')
      }
    }
  }
  if (page.slug === 'gambit') lines.push(...gambitReference())
  if (EXTRA[page.slug]) lines.push(...EXTRA[page.slug])

  lines.push('## 関連ページ')
  lines.push('')
  lines.push('- [遊び方ガイド](/play/)')
  lines.push('- [呪文一覧](/spells/) / [特技一覧](/skills/)')
  lines.push('')
  return { text: lines.join('\n'), count, title }
}

/** ガンビットで選べるものと、用意されている型の一覧 */
function gambitReference() {
  const lines = []
  const groups = [
    ['target', '対象', 'だれを見るか'],
    ['cond1', '条件', 'どんなときに動くか'],
    ['cond2', '条件のくわしい指定', '条件と組み合わせて使う'],
    ['action', '行動', '何をするか']
  ]

  lines.push('## 選べるもの')
  lines.push('')
  lines.push('1枚のルールは「対象・条件・行動」の組み合わせでできています。')
  lines.push('')
  for (const [type, label, lead] of groups) {
    const list = gambits.filter((g) => g.type === type)
    if (!list.length) continue
    lines.push(`### ${label}（${list.length}種）`)
    lines.push('')
    lines.push(`${lead}。`)
    lines.push('')
    lines.push('| 名前 | 説明 |')
    lines.push('| --- | --- |')
    for (const g of list) lines.push(`| ${cell(g.name)} | ${cell(g.note)} |`)
    lines.push('')
  }

  if (presets.length) {
    lines.push('## あらかじめ用意された型')
    lines.push('')
    lines.push(`${presets.length}種類あります。上の行から順に見て、当てはまった時点でその行動をとります。`)
    lines.push('')
    for (const p of presets) {
      const rules = p.rules.split(';').map((r) => r.split('|')).filter((r) => r.length >= 4)
      if (!rules.length) continue
      lines.push(`### ${p.name}`)
      lines.push('')
      lines.push('| 順 | 対象 | 条件 | 行動 |')
      lines.push('| ---: | --- | --- | --- |')
      rules.forEach(([target, c1, c2, action], i) => {
        const cond = [gname('cond1', c1), gname('cond2', c2)].filter(Boolean).join(' ')
        lines.push(`| ${i + 1} | ${cell(gname('target', target))} | ${cell(cond)} | ${cell(gname('action', action))} |`)
      })
      lines.push('')
    }
  }
  return lines
}

function playIndex(made) {
  const lines = []
  lines.push(...frontmatter('遊び方ガイド',
    'DQMVIの遊び方。始め方・冒険のきほん・ペット・職業・鍛冶・農業・釣り・施設・クエストの手引き。'))
  lines.push('# 遊び方ガイド')
  lines.push('')
  lines.push('ゲーム内の「導きの書」に書かれている内容を、項目ごとにまとめたものです。')
  lines.push('')
  lines.push('| ページ | 内容 | 項目数 |')
  lines.push('| --- | --- | ---: |')
  for (const m of made) {
    lines.push(`| [${cell(m.title)}](/play/${m.slug}) | ${cell(m.lead)} | ${m.count} |`)
  }
  lines.push('')
  return lines.join('\n')
}

// ── 書き出し ──────────────────────────────────────────────
for (const [dir, make] of [['spells', spellsPage], ['skills', skillsPage]]) {
  const d = join(DOCS, dir)
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  writeFileSync(join(d, 'index.md'), make(), 'utf8')
}

const PLAY_DIR = join(DOCS, 'play')
if (!existsSync(PLAY_DIR)) mkdirSync(PLAY_DIR, { recursive: true })
const made = []
for (const page of PLAY) {
  const out = playPage(page)
  if (!out.count) continue
  writeFileSync(join(PLAY_DIR, `${page.slug}.md`), out.text, 'utf8')
  made.push({ ...page, ...out })
}
writeFileSync(join(PLAY_DIR, 'index.md'), playIndex(made), 'utf8')

console.log(`呪文:     ${guide.filter((e) => e.major === '呪文').length}種`)
console.log(`特技:     ${guide.filter((e) => e.major === '特技').length}種`)
console.log(`遊び方:   ${made.length}ページ / ${made.reduce((n, m) => n + m.count, 0)}項目`)
for (const m of made) console.log(`  ${m.title}: ${m.count}項目`)
