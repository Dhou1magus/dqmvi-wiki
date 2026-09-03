#!/usr/bin/env node
/**
 * MOD公式サイトの更新履歴を、そのままのページにする。
 *
 *   node scripts/gen-update-pages.mjs
 *
 * ★本文は一字一句そのまま。並び順も原文どおり。
 *   読みやすくするために足しているのは「追加／変更／修正」の印だけで、
 *   これは文面から機械的に判定している。文そのものには手を入れない。
 *
 * 元データ: scripts/data/mod-updates.json
 *   公式サイト(https://dqmvi.kj-apps.com/)から取得し、
 *   全30グループのSHA-256が一致することを確認して保存したもの。
 *   新しい更新が出たら、同じ形でこのファイルに足せばページは作り直せる。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { recordCounts } from './lib/counts.mjs'
import { extraRows, extraSections, headingsOf, withTail, plainName } from './lib/handwritten.mjs'

const DATA = JSON.parse(readFileSync(join('scripts', 'data', 'mod-updates.json'), 'utf8'))
const OUT = join('docs', 'guide', 'updates.md')

/** 文末の言い回しから、追加／変更／修正のどれかに振り分ける */
function kindOf(text) {
  if (/不具合|修正|直しました|治りました/.test(text)) return '修正'
  if (/追加|実装|できるようにしました|作れるようにしました|見られるようにしました|対応/.test(text)) return '追加'
  return '変更'
}

/** 表の中で崩れない形にする。原文は変えず、記号だけ逃がす */
const cell = (v) => String(v).replace(/\|/g, '\\|')

/**
 * 見出しから飛べる名前。
 * ★VitePressが見出しから作る名前に合わせること。数字で始まる見出しには
 *   先頭に _ が付き、記号は - になる（2026.08.29-2 → _2026-08-29-2）。
 *   自分で別の付け方をするとリンクが全部死ぬ（実際に死なせた）。
 */
const anchorOf = (date) => '_' + date.replace(/[._,]+/g, '-').replace(/-+/g, '-').replace(/-$/, '')

const lines = []
const total = DATA.groups.reduce((n, g) => n + g.items.length, 0)

lines.push('---')
lines.push('title: MOD更新履歴')
lines.push(`description: DQMVIの公式サイトに載っている更新履歴${DATA.groups.length}回・${total}項目を、原文のまま読みやすく並べたもの。`)
lines.push('outline: [2, 2]')
lines.push('---')
lines.push('')
lines.push('# MOD更新履歴')
lines.push('')
lines.push(`公式サイトの更新履歴を、**原文のまま**転記したものです。${DATA.groups[DATA.groups.length - 1].date} から ${DATA.groups[0].date} まで、**${DATA.groups.length}回・${total}項目**あります。`)
lines.push('')
lines.push('::: tip このページについて')
lines.push(`本文は一字一句そのままで、並び順も変えていません。読みやすくするために **追加／変更／修正** の印だけ足しています（公式の分類ではありません）。`)
lines.push('')
lines.push(`出典: [DQMⅥ 公式サイト](${DATA.source})（${DATA.fetched} 取得）。最新の更新は公式サイトでご確認ください。`)
lines.push(':::')
lines.push('')

// ── 手書きで足された更新（公式サイトから取り込む前に編集者が写したもの）──
//   日付の見出しが DATA に無いものを、早見表の行と本文の節の両方で引き継ぐ。
//   同じ日付が DATA に入ったら公式の転記が優先され、手書きは消える。
const known = new Set(DATA.groups.map((g) => plainName(g.date)))
const handRows = extraRows(OUT, known).get('更新の一覧')?.rows ?? []
const handSections = extraSections(OUT, new Map([...known, '更新の一覧'].map((d) => [d, new Set()]))).h2

// ── 日付の早見表 ──
lines.push('## 更新の一覧')
lines.push('')
lines.push('| 日付 | 項目数 | 追加 | 変更 | 修正 |')
lines.push('| --- | ---: | ---: | ---: | ---: |')
lines.push(...handRows)           // 手書きぶんは新しいはずなので上に
for (const g of DATA.groups) {
  const k = { 追加: 0, 変更: 0, 修正: 0 }
  for (const t of g.items) k[kindOf(t)]++
  lines.push(`| [${cell(g.date)}](#${anchorOf(g.date)}) | ${g.items.length} | ${k.追加 || '—'} | ${k.変更 || '—'} | ${k.修正 || '—'} |`)
}
lines.push('')

// ── 本文 ──
for (const b of handSections) lines.push(b, '')
for (const g of DATA.groups) {
  lines.push(`## ${g.date}`)
  lines.push('')
  lines.push(`${g.items.length}項目`)
  lines.push('')
  for (const t of g.items) lines.push(`- **［${kindOf(t)}］** ${t.replace(/\|/g, '\\|')}`)
  lines.push('')
}

lines.push('## 関連ページ')
lines.push('')
lines.push('- [よくある質問](/guide/faq)')
lines.push('- [導入方法](/guide/install)')
lines.push('- [モンスター図鑑](/monsters/)')
lines.push('')

mkdirSync(join('docs', 'guide'), { recursive: true })
writeFileSync(OUT, withTail(lines.join('\n'), OUT), 'utf8')
recordCounts({ updateDays: DATA.groups.length, updateItems: total })

console.log(`更新の回数: ${DATA.groups.length}回`)
console.log(`項目:       ${total}件`)
console.log(`書き出し:   ${OUT}`)
