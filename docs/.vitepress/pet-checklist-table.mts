import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { MarkdownRenderer } from 'vitepress'

export const monsterDexPath = fileURLToPath(new URL('../monsters/index.md', import.meta.url)).replace(/\\/g, '/')

const headers = ['No.', '画像', 'モンスター', 'ランク', '系統']

function firstFiveCells(line: string): { source: string; cells: string[] } | null {
  if (!line.trimStart().startsWith('|')) return null
  const separators: number[] = []
  let escaped = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '\\') {
      escaped = !escaped
      continue
    }
    if (char === '|' && !escaped) separators.push(i)
    escaped = false
    if (separators.length === 6) break
  }
  if (separators.length < 6) return null
  return {
    source: line.slice(0, separators[5] + 1),
    cells: separators.slice(0, 5).map((start, index) => line.slice(start + 1, separators[index + 1]))
  }
}

export function petChecklistMarkdown(source: string): string {
  const lines = source.split(/\r?\n/)
  const start = lines.findIndex((line) => {
    const row = firstFiveCells(line)
    return row?.cells.every((cell, index) => cell.trim() === headers[index])
  })
  if (start < 0) throw new Error('モンスター図鑑の先頭5列が見つかりません')
  const separator = firstFiveCells(lines[start + 1] ?? '')
  if (!separator?.cells.every((cell) => /^\s*:?-+:?\s*$/.test(cell))) {
    throw new Error('モンスター図鑑の表の区切り行が見つかりません')
  }
  const rows: string[] = []
  for (let i = start; i < lines.length && lines[i].trimStart().startsWith('|'); i++) {
    const row = firstFiveCells(lines[i])
    if (!row) throw new Error(`モンスター図鑑の${i + 1}行目に先頭5列がありません`)
    rows.push(row.source)
  }
  if (rows.length < 3) throw new Error('モンスター図鑑の表にモンスターがありません')
  return rows.join('\n') + '\n'
}

type ChecklistEnv = {
  includes?: string[]
  links?: string[]
  [key: string]: unknown
}

export function renderPetChecklist(md: MarkdownRenderer, env: ChecklistEnv): string {
  const includes = env.includes ?? (env.includes = [])
  if (!includes.includes(monsterDexPath)) includes.push(monsterDexPath)
  const tableEnv: ChecklistEnv = { ...env, links: [] }
  const html = md.render(petChecklistMarkdown(readFileSync(monsterDexPath, 'utf8')), tableEnv)
  const links = env.links ?? (env.links = [])
  links.push(...(tableEnv.links ?? []))
  return html
}
