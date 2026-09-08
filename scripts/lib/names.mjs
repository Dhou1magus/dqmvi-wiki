/**
 * 「自分のページを持たないもの」の名前を検索の索引に足す。
 *
 * トップの検索はページの名前を引く。だが呪文・特技・多くの装備は
 * 一覧ページの表の1行でしかないので、ページが無い＝名前で引けない。
 * 「ベホイミ」「はがねのつるぎ」と打っても何も出ないのは 0.1秒 の理念に反する。
 *
 * そこで各 gen-*.mjs が、載っている一覧ページのURLと一緒にここへ名前を書き込む。
 * config.mts がページの索引と合わせて読む（同じ名前のページがあればそちらが勝つ）。
 *
 *   import { recordNames } from './lib/names.mjs'
 *   recordNames('spells', [['ベホイミ', '/spells/', '呪文'], ...])
 *
 * 第1引数は書き込む側の名前。同じ札で上書きするので、
 * 何度流しても重複しないし、消えたものは消える。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'

const PATH = join('scripts', 'data', 'name-index.json')

export function recordNames(owner, entries) {
  let current = {}
  if (existsSync(PATH)) {
    try {
      current = JSON.parse(readFileSync(PATH, 'utf8'))
    } catch {
      current = {}
    }
  }
  current[owner] = entries
  mkdirSync(dirname(PATH), { recursive: true })
  const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync(PATH, JSON.stringify(sorted, null, 1) + '\n', 'utf8')
}
