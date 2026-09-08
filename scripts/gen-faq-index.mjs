#!/usr/bin/env node
/**
 * よくある質問の1問1問を、トップの検索で引けるようにする。
 *
 *   node scripts/gen-faq-index.mjs
 *
 * FAQは1ページなので、そのままだと索引には「よくある質問」の1件しか入らない。
 * 33問それぞれを「質問文 + タグ」で登録し、当たったらその質問の位置へ直接飛ばす。
 *
 * タグは docs/guide/faq.md の各質問（### 見出し）の下にある「タグ: a・b・c」の行から読む。分類（## 見出し）にはタグが無いので入らない。
 * つまりFAQ本文がタグの正本で、ブラウザから直接編集すれば索引にも反映される。
 *
 * ★見出しから飛び先(#...)を作る規則は VitePress と同じにすること。
 *   下の slugify は node_modules/vitepress/dist/node の実装を写したもの。
 *   ずれるとリンクが全部死ぬので、ビルド後のHTMLの id と突き合わせて確認する。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { recordNames } from './lib/names.mjs'

const FAQ = join('docs', 'guide', 'faq.md')

// VitePress（@mdit-vue/shared）の slugify そのまま。制御文字は \u で書く
const rControl = new RegExp('[\\u0000-\\u001f]', 'g')
const rSpecial = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g
const rCombining = new RegExp('[\\u0300-\\u036f]', 'g')
const slugify = (str) => str.normalize('NFKD')
  .replace(rCombining, '').replace(rControl, '').replace(rSpecial, '-')
  .replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '').replace(/^(\d)/, '_$1').toLowerCase()

const entries = []
let current = null
for (const line of readFileSync(FAQ, 'utf8').split(/\r?\n/)) {
  // 質問は「### 」（## は分類の見出し。2026-09-04 に分類ごとに分けた）。古い ## の質問もタグがあれば拾う
  const h = line.match(/^(#{2,3}) (.+)$/)
  if (h) {
    current = { title: h[2].trim(), tags: '' }
    entries.push(current)
  } else if (current && /^タグ[:：]/.test(line)) {
    current.tags = line.replace(/^タグ[:：]\s*/, '').split(/[・、,\s]+/).filter(Boolean).join(' ')
  }
}

// タグの無い見出し（質問でないもの）は入れない
const questions = entries.filter((e) => e.tags)
recordNames('faq', questions.map((e) => [e.title, `/guide/faq#${slugify(e.title)}`, 'よくある質問', e.tags]))

console.log(`よくある質問: ${questions.length}問を索引に登録`)
for (const e of questions.slice(0, 3)) console.log(`  ${e.title} → #${slugify(e.title)}`)
