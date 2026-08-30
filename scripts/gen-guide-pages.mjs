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
 *   adventure_guide.tsv … id / 解放段階 / 大分類 / 小分類 / タイトル / 本文
 *                         本文の改行は ⏎、1行の中の区切りは " / "
 *                         「消費MP: 2 / 基本威力: 8 / 範囲: 単体」のように
 *                         「項目: 値」の形で書かれている行は表の列に振り分ける。
 *
 * 書き出すファイル:
 *   docs/spells/index.md  呪文一覧
 *   docs/skills/index.md  特技一覧
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

// ── 書き出し ──────────────────────────────────────────────
for (const [dir, make] of [['spells', spellsPage], ['skills', skillsPage]]) {
  const d = join(DOCS, dir)
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  writeFileSync(join(d, 'index.md'), make(), 'utf8')
}

console.log(`呪文: ${guide.filter((e) => e.major === '呪文').length}種`)
console.log(`特技: ${guide.filter((e) => e.major === '特技').length}種`)
