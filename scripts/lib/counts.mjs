/**
 * トップページに出す件数を1か所に集める。
 *
 * 「モンスター586体」のような数を .vue に手で書くと、MODが更新されたとき必ず古くなる。
 * （実際 579体・1071種のまま何日も放置されていた）
 * 各 gen-*.mjs が作り終わりにここへ書き込み、config.mts がビルド時に読んでトップに渡す。
 *
 *   import { recordCounts } from './lib/counts.mjs'
 *   recordCounts({ monsters: 586, bosses: 17 })
 *
 * 書き込みは合流。ほかのスクリプトが入れた値は消さない。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'

const PATH = join('scripts', 'data', 'counts.json')

export function recordCounts(values) {
  let current = {}
  if (existsSync(PATH)) {
    try {
      current = JSON.parse(readFileSync(PATH, 'utf8'))
    } catch {
      current = {} // 壊れていたら作り直す。件数なので失っても再生成で戻る
    }
  }
  mkdirSync(dirname(PATH), { recursive: true })
  writeFileSync(PATH, JSON.stringify({ ...current, ...values }, null, 1) + '\n', 'utf8')
}
