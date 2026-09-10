import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canonicalUrl, isEmptyItemPage, seoHead } from './seo.mts'

const siteUrl = 'https://Dhou1magus.github.io/dqmvi-wiki/'
const emptyItem = '---\ntitle: 鉄の剣\n---\n\n# 鉄の剣\n'

test('canonical URLs retain the project base and use the published clean routes', () => {
  assert.equal(canonicalUrl('index.md', siteUrl), 'https://dhou1magus.github.io/dqmvi-wiki/')
  assert.equal(canonicalUrl('monsters/index.md', siteUrl), 'https://dhou1magus.github.io/dqmvi-wiki/monsters/')
  assert.equal(canonicalUrl('monsters/sura.md', siteUrl), 'https://dhou1magus.github.io/dqmvi-wiki/monsters/sura')
})

test('only generated title-only item pages are excluded from indexing', () => {
  assert.equal(isEmptyItemPage('items/tetunoturugi.md', emptyItem), true)
  assert.equal(isEmptyItemPage('items/tetunoturugi.md', '\uFEFF' + emptyItem.replace(/\n/g, '\r\n')), true)
  assert.equal(isEmptyItemPage('index.md', emptyItem), false)
  assert.equal(isEmptyItemPage('monsters/sura.md', emptyItem), false)
  assert.equal(isEmptyItemPage('items/tetunoturugi.md', emptyItem.replace('title: 鉄の剣', 'title: 鉄の剣\nlayout: page')), false)
})

test('adding article content automatically restores indexing', () => {
  for (const content of ['説明文', '## 入手方法', '| 名前 | 効果 |\n| --- | --- |', '![鉄の剣](/img/sword.png)', '```text\n例\n```']) {
    const source = `${emptyItem}\n${content}\n`
    assert.equal(isEmptyItemPage('items/tetunoturugi.md', source), false)
    assert.equal(seoHead('items/tetunoturugi.md', siteUrl, source).some(([, attrs]) => attrs.name === 'robots'), false)
  }
})

test('robots metadata excludes unfinished items and the error page, but allows real pages', () => {
  const robots = ['meta', { name: 'robots', content: 'noindex, follow' }]
  assert.deepEqual(seoHead('404.md', siteUrl), [robots])
  assert.deepEqual(seoHead('items/tetunoturugi.md', siteUrl, emptyItem).at(-1), robots)
  for (const page of ['index.md', 'monsters/sura.md', 'items/weapons.md']) {
    assert.equal(seoHead(page, siteUrl).some(([, attrs]) => attrs.name === 'robots'), false)
  }
})
