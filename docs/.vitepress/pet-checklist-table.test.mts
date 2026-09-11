import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { createMarkdownRenderer, disposeMdItInstance } from 'vitepress'
import { after } from 'node:test'
import config from './config.mts'
import { monsterDexPath, petChecklistMarkdown, renderPetChecklist } from './pet-checklist-table.mts'

const md = await createMarkdownRenderer(resolve('docs'), { ...config.markdown, headers: true }, config.base)
after(() => disposeMdItInstance())

const fixture = [
  '# 図鑑',
  '',
  '| No. | 画像 | モンスター | ランク | 系統 | HP |',
  '| ---: | :--: | --- | :--: | :--: | ---: |',
  '| 2 | ![名前\\|別名](/img/blank.png) | [名前\\|別名](/monsters/example) | 2 | 自然 | 10 |',
  '| 1 | ![](/img/blank.png) | ??? |  |  |  |',
  '',
  '後ろの本文'
].join('\n')

test('copies escaped cells, hidden names, blank values and the source row order', () => {
  assert.equal(petChecklistMarkdown(fixture), [
    '| No. | 画像 | モンスター | ランク | 系統 |',
    '| ---: | :--: | --- | :--: | :--: |',
    '| 2 | ![名前\\|別名](/img/blank.png) | [名前\\|別名](/monsters/example) | 2 | 自然 |',
    '| 1 | ![](/img/blank.png) | ??? |  |  |',
    ''
  ].join('\n'))
  assert.equal(petChecklistMarkdown(fixture.replace(/\n/g, '\r\n')), petChecklistMarkdown(fixture))
})

test('fails instead of silently dropping an incomplete source row', () => {
  assert.throws(() => petChecklistMarkdown(fixture.replace('| 1 | ![](/img/blank.png) | ??? |  |  |  |', '| 1 | ??? |')), /先頭5列がありません/)
  assert.throws(() => petChecklistMarkdown('# 表のない図鑑'), /先頭5列が見つかりません/)
})

function tableCells(html: string): string[][] {
  const table = html.match(/<table\b[^>]*>[\s\S]*?<\/table>/)?.[0] ?? ''
  return [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)]
    .map((row) => [...row[1].matchAll(/<t[hd]\b[^>]*>[\s\S]*?<\/t[hd]>/g)].map((cell) => cell[0]))
}

test('every published dex row renders exactly the same first five cells', () => {
  const source = readFileSync(monsterDexPath, 'utf8')
  const original = md.render(source, { path: monsterDexPath, relativePath: 'monsters/index.md', cleanUrls: true })
  const env = { path: resolve('docs/play/pet-checklist.md'), relativePath: 'play/pet-checklist.md', cleanUrls: true, includes: [], links: [] }
  const actual = tableCells(renderPetChecklist(md, env))
  const expected = tableCells(original).map((row) => row.slice(0, 5))
  assert.ok(expected.length > 1)
  assert.ok(actual.every((row) => row.length === 5))
  assert.deepEqual(actual, expected)
  assert.deepEqual(env.includes, [monsterDexPath])
  assert.ok(env.links.length > 0)
})

test('the empty fence keeps the surrounding page metadata and tracks the dex dependency', () => {
  const source = readFileSync('docs/play/pet-checklist.md', 'utf8')
  const env: Record<string, any> = {
    path: resolve('docs/play/pet-checklist.md'), relativePath: 'play/pet-checklist.md', cleanUrls: true, includes: []
  }
  const html = md.render(source, env)
  assert.equal(env.title, 'ペットチェックリスト')
  assert.equal(env.frontmatter.title, 'ペットチェックリスト')
  assert.equal(env.frontmatter.pageClass, 'wide-page monster-dex pet-checklist')
  assert.equal(env.content.includes('```pet-checklist'), true)
  assert.equal(env.headers.some((header: { title: string }) => header.title === '関連ページ'), true)
  assert.deepEqual(env.includes, [monsterDexPath])
  assert.ok(env.links.some((link: string) => link.includes('/monsters/sura')))
  assert.ok(env.links.some((link: string) => link.includes('/play/pets')))
  assert.equal((html.match(/<table\b/g) ?? []).length, 1)
  assert.equal(md.options.html, false)
})
