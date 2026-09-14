import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const CATALOGS = /^items\/(weapons|armor|shields|accessories|tensei)\.md$/
const CATEGORY_IDS: Record<string, Set<string>> = {
  weapons: new Set(['sword', 'hero-sword', 'spear', 'dagger', 'staff', 'kon', 'claw', 'fist', 'hammer', 'axe', 'whip', 'bow', 'boomerang', 'vanilla-sword', 'gun', 'battle-ring', 'harp', 'other']),
  armor: new Set(['head', 'body', 'legs', 'feet', 'other']),
  accessories: new Set(['ear', 'neck', 'arm', 'finger', 'other']),
  tensei: new Set(['weapons', 'armor', 'shields', 'accessories'])
}
const EQUIPMENT_HEADS = new Set(['武器', '杖', '防具', '盾', 'アクセサリー'])
const UNKNOWN = new Set(['', '—', '未確認', '未記入', '確認した値'])
const splitCells = (row: string) => row.trim().slice(1, -1).split(/(?<!\\)\|/).map((cell) => cell.trim())
const rowText = (cells: string[]) => `| ${cells.join(' | ')} |`

function withoutFences(markdown: string): string {
  let fence = ''
  return markdown.split('\n').filter((line) => {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (match) {
      if (!fence) fence = match[1]
      else if (match[1][0] === fence[0] && match[1].length >= fence.length && !match[2].trim()) fence = ''
      return false
    }
    return !fence
  }).join('\n')
}

function section(markdown: string, heading: string): { body: string, anchor: string } {
  const lines = withoutFences(markdown).split('\n')
  const start = lines.findIndex((line) => line.replace(/\s*\{#[^}]+\}\s*$/, '').trim() === `## ${heading}`)
  if (start < 0) return { body: '', anchor: heading }
  let end = start + 1
  while (end < lines.length && !/^#{1,2}\s/.test(lines[end])) end++
  return { body: lines.slice(start + 1, end).join('\n'), anchor: lines[start].match(/\{#([^}]+)\}/)?.[1] ?? heading }
}

function tableRows(markdown: string): { head: string[], rows: string[][] }[] {
  const tables: { head: string[], rows: string[][] }[] = []
  const pattern = /^(\|[^\n]+\|)\n\|[ :|\t-]+\|\n((?:\|[^\n]*\|(?:\n|$))*)/gm
  for (const match of markdown.matchAll(pattern)) {
    tables.push({ head: splitCells(match[1]), rows: match[2].trimEnd().split('\n').filter(Boolean).map(splitCells) })
  }
  return tables
}

export function equipmentSourceLabel(markdown: string, href: string): string {
  const text = markdown.replace(/\r\n/g, '\n')
  const methods: string[] = []
  const forging = section(text, '鍛冶')
  const recipes = tableRows(forging.body).filter((table) => table.head.join('|') === '項目|内容')
    .map((table) => new Map(table.rows.map((row) => [row[0], row[1]])))
  const ranks = [...new Set(recipes.map((conditions) => conditions.get('必要な土地ランク') ?? ''))]
  const allRanksKnown = ranks.length > 0 && ranks.every((rank) => /^[1-7]$/.test(rank))
  if (allRanksKnown || recipes.some((conditions) => /^[1-7]$/.test(conditions.get('必要な土地ランク') ?? '') ||
    /^[1-9]\d*$/.test(conditions.get('必要な鍛治Lv合計') ?? ''))) {
    const label = allRanksKnown ? `鍛冶（ランク${ranks.sort((a, b) => Number(a) - Number(b)).join('・')}）` : '鍛冶'
    methods.push(`[${label}](${href}#${encodeURIComponent(forging.anchor)})`)
  }

  const dropSection = section(text, '落とすモンスター')
  const drops = tableRows(dropSection.body.split(/^#{3,6}\s/m)[0]).find((table) =>
    table.head.includes('モンスター') && table.head.includes('ランク'))
  if (drops?.rows.length) {
    const column = drops.head.indexOf('ランク')
    const ranks = [...new Set(drops.rows.map((row) => row[column]))]
    const label = ranks.every((rank) => /^[1-7]$/.test(rank))
      ? `ドロップ（敵ランク${ranks.sort((a, b) => Number(a) - Number(b)).join('・')}）` : 'ドロップ'
    methods.push(`[${label}](${href}#${encodeURIComponent(dropSection.anchor)})`)
  }

  const acquisition = section(text, '入手方法')
  if (tableRows(acquisition.body).some((table) => table.head.includes('方法') &&
    table.rows.some((row) => !UNKNOWN.has(row[table.head.indexOf('方法')])))) {
    methods.push(`[入手方法を見る](${href}#${encodeURIComponent(acquisition.anchor)})`)
  }
  return methods.join(' / ') || '未確認'
}

export function addEquipmentSources(markdown: string, relativePath: string, docsDir = 'docs'): string {
  const catalog = CATALOGS.exec(relativePath ?? '')?.[1]
  if (!catalog) return markdown
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  let fence = ''
  let depth = 0
  let category = ''
  let beforeSections = true
  for (let i = 0; i < lines.length; i++) {
    const marker = lines[i].match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (marker) {
      if (!fence) fence = marker[1]
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = ''
      continue
    }
    if (fence) continue
    const heading = lines[i].match(/^(#{1,6})\s/)
    if (heading) {
      depth = heading[1].length
      if (depth === 2) {
        beforeSections = false
        category = lines[i].match(/\{#([^}]+)\}/)?.[1] ?? ''
      }
    }
    if (catalog === 'shields' ? !beforeSections : !CATEGORY_IDS[catalog]?.has(category)) continue
    if (depth > 2 || !lines[i].startsWith('|') || !/^\|[ :|\t-]+\|$/.test(lines[i + 1] ?? '')) continue
    const head = splitCells(lines[i])
    if (!EQUIPMENT_HEADS.has(head[0]) || head.at(-1) !== '特殊効果') continue
    lines[i] = rowText([...head, '入手先'])
    lines[i + 1] = rowText([...splitCells(lines[i + 1]), '---'])
    i += 2
    while (i < lines.length && lines[i].startsWith('|')) {
      const values = splitCells(lines[i])
      const href = values[0].match(/\]\((\/(?:drops|items)\/[a-zA-Z0-9_-]+)\)/)?.[1]
      const path = href ? join(docsDir, `${href.slice(1)}.md`) : ''
      const source = path && existsSync(path) ? readFileSync(path, 'utf8') : ''
      lines[i] = rowText([...values, href && source ? equipmentSourceLabel(source, href) : '未確認'])
      i++
    }
    i--
  }
  return lines.join('\n')
}
