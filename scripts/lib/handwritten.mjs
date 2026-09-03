/**
 * 手書きで足されたものを、再生成で消さないための共通処理。
 *
 * 生成ページは gen-*.mjs が丸ごと書き直す。編集者はMODのデータを取り込めないので、
 * 増えたものを手で足せるようにし、次の再生成で次の4つを引き継ぐ:
 *
 *   1. 末尾の「## 攻略メモ」より下          … keptTail()
 *   2. 表に足した行（1列目の名前が生成側に無いもの）… extraRows()
 *   3. 足した見出し（## / ### とその本文）      … extraSections()
 *   4. 生成側に無いファイル名のページ           … mergeHandwrittenPages()
 *      （title が正式なものと同じなら攻略メモを移して片付ける）
 *
 * 決まり: 生成側が知っている行・文を書き換えても、次の再生成で元に戻る。
 * 手書きが残るのは「足したもの」だけ。詳しくは /guide/edit。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

export const KEEP_HEADING = '## 攻略メモ'
export const EMPTY_NOTE = '（未記入）'

/** 既存ページの「## 攻略メモ」より下。無い・空なら '' */
export function keptTail(path) {
  if (!existsSync(path)) return ''
  const cur = readFileSync(path, 'utf8')
  const i = cur.indexOf(KEEP_HEADING)
  if (i === -1) return ''
  return cur.slice(i + KEEP_HEADING.length)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/（まだありません。気づいたことがあれば書き足してください）/g, '')
    .replace(/^\s*（未記入）\s*$/gm, '')
    .trim()
}

/** 本文の末尾に攻略メモを付ける。placeholder=true なら空でも見出しと（未記入）を出す */
export function withTail(body, path, { placeholder = false } = {}) {
  const kept = keptTail(path)
  const text = body.replace(/\n+$/, '\n')
  if (!kept && !placeholder) return text
  return `${text}\n${KEEP_HEADING}\n\n${kept || EMPTY_NOTE}\n`
}

/** セルの文字から名前だけ取り出す（リンク・太字・空白を外す）。「扉[盗賊の鍵]」のように名前に [ ] が入るリンクも外せる */
export function plainName(cell) {
  return String(cell ?? '')
    .replace(/\[((?:[^[\]]|\[[^[\]]*\])*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, '')
    .trim()
}

/** 見出しの突き合わせ用。「剣（28種）」→「剣」 */
export function headingKey(text) {
  return String(text ?? '').replace(/^#+\s*/, '').replace(/[（(]\s*\d[^）)]*[）)]\s*$/, '').trim()
}

const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|')

/**
 * 既存ページの表から、生成側が知らない行（1列目の名前が known に無い行）を拾う。
 * 返り値は Map<h2見出し, { head: [見出し行, 区切り行], rows: 行[] }>。
 * 表が最初の h2 より前にあれば '' が鍵。行はそのままの文字列なので、
 * 生成側は同じ表の末尾に rows を足せばよい。生成側に無い見出しなら head ごと出せる。
 * 名前が1列目でない表（図鑑の No. 付きの表）は nameCol で列を指定する。
 * nameHeader（名前の列の見出し。「モンスター」など）を渡すと、見出し行からその列の位置を探して
 * nameCol より優先する。列を足したり減らしたりした後でも、古い並びの表から名前を正しく拾える
 * （2026-09-03 図鑑に「画像」列を足したとき、全行が「知らない行」扱いで二重になった）。
 * ページに種類の違う表が混ざるときは header（見出し行の書き出し）で対象の表を絞る。
 */
export function extraRows(path, known, { nameCol = 0, nameHeader = '', header = '' } = {}) {
  const out = new Map()
  if (!existsSync(path)) return out
  let section = ''
  let inTable = false
  let wanted = true
  let rowNo = 0
  let head = []
  let col = nameCol
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trimEnd()
    if (/^##\s/.test(line)) { section = headingKey(line); inTable = false; continue }
    if (!line.startsWith('|')) { inTable = false; continue }
    if (!inTable) { inTable = true; rowNo = 0; head = []; col = nameCol; wanted = !header || line.startsWith(header) }
    if (!wanted) continue                        // 見出しが違う表（傾向の表など）は見ない
    rowNo++
    if (rowNo <= 2) {                            // 見出し行と区切り行
      head.push(line)
      if (rowNo === 1 && nameHeader) {
        const i = cells(line).findIndex((c) => plainName(c) === nameHeader)
        if (i >= 0) col = i
      }
      continue
    }
    if (/^\|\s*:?-+/.test(line)) continue
    const name = plainName(cells(line)[col])
    if (!name || known.has(name)) continue
    if (!out.has(section)) out.set(section, { head: head.slice(), rows: [] })
    out.get(section).rows.push(line)
  }
  return out
}

/** 生成側が出さなかった見出しの表を、head ごとまとめて返す（extraRows の結果から） */
export function leftoverTables(extra, emitted) {
  const lines = []
  for (const [section, t] of extra) {
    if (!section || emitted.has(section)) continue
    lines.push(`## ${section}`, '', ...t.head, ...t.rows, '')
  }
  return lines
}

/**
 * 既存ページから、生成側が知らない見出しとその本文を拾う。
 *   known: Map<h2, Set<h3>>  生成側が出す見出し
 * 返り値: { h2: [ブロック文字列…], h3: Map<h2, [ブロック文字列…]> }
 *   h2 … 知らない ## ごと（本文と ### を含む）
 *   h3 … 知っている ## の下にある、知らない ###（本文を含む）
 * 「関連ページ」と「攻略メモ」は対象外（攻略メモは keptTail が扱う）。
 */
export function extraSections(path, known) {
  const out = { h2: [], h3: new Map() }
  if (!existsSync(path)) return out
  const lines = readFileSync(path, 'utf8').split('\n')
  const skip = new Set(['関連ページ', '攻略メモ'])
  let i = 0
  while (i < lines.length && !/^##\s/.test(lines[i])) i++
  while (i < lines.length) {
    const h2 = headingKey(lines[i])
    let j = i + 1
    while (j < lines.length && !/^##\s/.test(lines[j])) j++
    const block = lines.slice(i, j)
    if (!skip.has(h2)) {
      if (!known.has(h2)) {
        out.h2.push(block.join('\n').replace(/\n+$/, ''))
      } else {
        const knownH3 = known.get(h2)
        let k = 1
        while (k < block.length && !/^###\s/.test(block[k])) k++
        while (k < block.length) {
          const h3 = headingKey(block[k])
          let l = k + 1
          while (l < block.length && !/^###\s/.test(block[l])) l++
          if (!knownH3.has(h3)) {
            if (!out.h3.has(h2)) out.h3.set(h2, [])
            out.h3.get(h2).push(block.slice(k, l).join('\n').replace(/\n+$/, ''))
          }
          k = l
        }
      }
    }
    i = j
  }
  return out
}

/** 攻略メモが空の正式ページに memo を入れる（すでに書いてあれば触らない） */
export function injectTail(path, memo) {
  if (!memo || !existsSync(path) || keptTail(path)) return false
  const cur = readFileSync(path, 'utf8')
  const i = cur.indexOf(KEEP_HEADING)
  const head = i === -1 ? cur.replace(/\n+$/, '\n') + '\n' : cur.slice(0, i)
  writeFileSync(path, `${head}${KEEP_HEADING}\n\n${memo}\n`, 'utf8')
  return true
}

/**
 * 生成側に無いファイル名のページを、title で正式ページと突き合わせる。
 *   dir      … ページの置き場所
 *   pages    … [title, 正式なファイル名（拡張子なし）] の並び（生成した全ページ）
 *   label    … 表示用（「手書きページ」など）
 * 同じ title があれば攻略メモを移して片付け、無ければそのまま残す。
 * 同じ title の正式ページが2つ以上あるとき（「ドラゴン」「おおがらす」など14組）は
 * どちらか決められないので触らない。どれも1行ずつ報告する。
 */
export function mergeHandwrittenPages(dir, pages, label = '手書きページ') {
  const known = new Set(pages.map(([, stem]) => stem))
  const byTitle = new Map()
  for (const [title, stem] of pages) {
    const t = plainName(title)
    byTitle.set(t, byTitle.has(t) ? null : stem)   // null = 同名が複数あって決められない
  }
  const notes = []
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.md') || f === 'index.md') continue
    const stem = f.slice(0, -3)
    if (known.has(stem)) continue
    const path = join(dir, f)
    const title = plainName((/^title:\s*(.+)$/m.exec(readFileSync(path, 'utf8')) ?? [])[1] ?? '')
    const target = title && byTitle.get(title)
    if (target === null) {
      notes.push(`${label}:   ${f}（同じ名前の正式なページが複数あるので、そのまま残す。手で確かめること）`)
      continue
    }
    if (!target) {
      notes.push(`${label}:   ${f}（同じ名前の正式なページが無いので、そのまま残す）`)
      continue
    }
    const moved = injectTail(join(dir, `${target}.md`), keptTail(path))
    try {
      rmSync(path)
      notes.push(`${label}:   ${f} → ${target}.md に統合した${moved ? '（攻略メモを引き継ぎ）' : ''}`)
    } catch {
      notes.push(`${label}:   ${f} → ${target}.md に統合したが消せなかった。手で削除すること`)
    }
  }
  for (const n of notes) console.log(n)
  return notes.length
}

/** 生成した本文の見出し一覧 Map<h2, Set<h3>>（extraSections の known に渡す） */
export function headingsOf(text) {
  const known = new Map()
  let h2 = ''
  for (const line of text.split('\n')) {
    if (/^##\s/.test(line)) { h2 = headingKey(line); if (!known.has(h2)) known.set(h2, new Set()) }
    else if (/^###\s/.test(line) && known.has(h2)) known.get(h2).add(headingKey(line))
  }
  return known
}

/**
 * 既存ページにあって生成側に無い見出しを、生成した本文に差し込む。
 *   ・知っている ## の下の知らない ### … その ## の末尾
 *   ・知らない ##                       … 「## 関連ページ」「## 攻略メモ」の手前（無ければ末尾）
 */
export function withExtraSections(text, path) {
  const extra = extraSections(path, headingsOf(text))
  if (!extra.h2.length && !extra.h3.size) return text
  const out = []
  let current = ''
  const flush = () => {
    const blocks = extra.h3.get(current)
    if (!blocks) return
    if (out.length && out[out.length - 1] !== '') out.push('')
    for (const b of blocks) out.push(b, '')
    extra.h3.delete(current)
  }
  for (const line of text.split('\n')) {
    if (/^##\s/.test(line)) {
      flush()
      const key = headingKey(line)
      if ((key === '関連ページ' || key === '攻略メモ') && extra.h2.length) {
        for (const b of extra.h2) out.push(b, '')
        extra.h2 = []
      }
      current = key
    }
    out.push(line)
  }
  flush()
  if (extra.h2.length) {
    if (out.length && out[out.length - 1] !== '') out.push('')
    for (const b of extra.h2) out.push(b, '')
  }
  return out.join('\n')
}

/** 生成した本文に、足された見出しと攻略メモを引き継がせて返す（書き出す直前に通す） */
export function finish(text, path, opts) {
  return withTail(withExtraSections(text, path), path, opts)
}
