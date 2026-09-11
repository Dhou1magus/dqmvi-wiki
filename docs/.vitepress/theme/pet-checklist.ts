import { createPetChecklistStore, PET_CHECKLIST_STORAGE_KEY } from './pet-checklist-storage'
import { DEX_SPECIES } from './dex-filter'

type Entry = { id: string; species: string; row: HTMLTableRowElement; input: HTMLInputElement }

let active: { table: HTMLTableElement; dispose: () => void } | undefined

export function setupPetChecklist(): void {
  const table = document.querySelector<HTMLTableElement>('.Layout.pet-checklist .vp-doc table')
  if (table && active?.table === table) return
  active?.dispose()
  active = undefined
  if (!table) return

  const headers = [...(table.tHead?.rows[0]?.cells ?? [])]
  const nameColumn = headers.findIndex((cell) => cell.textContent?.trim() === 'モンスター')
  const speciesColumn = headers.findIndex((cell) => cell.textContent?.trim() === '系統')
  if (nameColumn < 0) return

  let storage: Storage | null = null
  try { storage = window.localStorage } catch {}
  const store = createPetChecklistStore(storage)
  const controller = new AbortController()
  const entries: Entry[] = []

  for (const row of table.tBodies[0]?.rows ?? []) {
    const cell = row.cells[nameColumn]
    const link = cell?.querySelector<HTMLAnchorElement>('a[href]')
    const match = link?.getAttribute('href')?.match(/\/monsters\/([^/?#]+)\/?(?:[?#].*)?$/)
    if (!match) continue
    let id: string
    try { id = decodeURIComponent(match[1]) } catch { continue }
    const name = link?.textContent?.trim() ?? id
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.dataset.monsterId = id
    input.setAttribute('aria-label', `${name}（No.${row.cells[0].textContent?.trim()}）をペットにした`)

    const control = document.createElement('label')
    control.className = 'pet-check'
    control.append(input)
    const nameWrap = document.createElement('div')
    nameWrap.className = 'pet-monster-name'
    nameWrap.append(control, ...cell.childNodes)
    cell.append(nameWrap)
    const species = row.cells[speciesColumn]?.textContent?.trim() ?? ''
    entries.push({ id, species, row, input })
  }

  if (!entries.length) return
  table.dataset.petChecklist = 'ready'

  const summary = document.createElement('section')
  summary.className = 'pet-progress'
  summary.setAttribute('aria-label', 'ペット収集の進み具合')
  const counts = document.createElement('div')
  counts.className = 'pet-progress-counts'
  counts.setAttribute('role', 'status')
  counts.setAttribute('aria-live', 'polite')
  counts.setAttribute('aria-atomic', 'true')
  const total = document.createElement('p')
  total.className = 'pet-progress-total'
  const label = document.createElement('span')
  label.textContent = 'ペットにした'
  const count = document.createElement('strong')
  const percentage = document.createElement('span')
  percentage.className = 'pet-progress-percentage'
  total.append(label, count, percentage)
  const filtered = document.createElement('p')
  filtered.className = 'pet-progress-filtered'
  counts.append(total, filtered)
  const progress = document.createElement('progress')
  progress.max = entries.length
  progress.setAttribute('aria-label', 'ペットにした割合')

  const speciesSection = document.createElement('section')
  speciesSection.className = 'pet-species-progress'
  speciesSection.setAttribute('aria-label', '系統別の達成率')
  const speciesTitle = document.createElement('p')
  speciesTitle.className = 'pet-species-title'
  speciesTitle.textContent = '系統別の達成率'
  const speciesGrid = document.createElement('ul')
  speciesGrid.className = 'pet-species-grid'
  const grouped = DEX_SPECIES.map((species) => ({
    name: `${species}系`,
    entries: entries.filter((entry) => entry.species === species)
  }))
  const unlisted = entries.filter((entry) => !DEX_SPECIES.includes(entry.species))
  if (unlisted.length) grouped.push({ name: '系統未掲載', entries: unlisted })
  const speciesCounters = grouped.filter((group) => group.entries.length).map((group) => {
    const item = document.createElement('li')
    const heading = document.createElement('p')
    heading.className = 'pet-species-heading'
    const name = document.createElement('span')
    name.textContent = group.name
    const percentage = document.createElement('strong')
    heading.append(name, percentage)
    const count = document.createElement('p')
    count.className = 'pet-species-count'
    const progress = document.createElement('progress')
    progress.max = group.entries.length
    progress.setAttribute('aria-label', `${group.name}のペットにした割合`)
    item.append(heading, count, progress)
    speciesGrid.append(item)
    return { ...group, count, percentage, progress }
  })
  speciesSection.append(speciesTitle, speciesGrid)

  const error = document.createElement('p')
  error.className = 'pet-save-error'
  error.setAttribute('role', 'status')
  error.hidden = true
  error.textContent = 'チェック内容を保存できません。今回の変更はページを閉じると失われる場合があります。'
  summary.append(counts, progress, speciesSection, error)
  table.before(summary)

  const updateCounts = () => {
    const checked = entries.filter(({ input }) => input.checked).length
    const visible = entries.filter(({ row }) => !row.classList.contains('dex-hide'))
    const visibleChecked = visible.filter(({ input }) => input.checked).length
    count.textContent = `${checked} / ${entries.length}体`
    percentage.textContent = `${Math.round(checked / entries.length * 1000) / 10}%`
    filtered.textContent = `表示中：${visible.length}体 ／ チェック済み：${visibleChecked}体`
    progress.value = checked
    progress.setAttribute('aria-valuetext', `${entries.length}体中${checked}体`)
    for (const group of speciesCounters) {
      const checked = group.entries.filter(({ input }) => input.checked).length
      group.count.textContent = `${checked} / ${group.entries.length}体`
      group.percentage.textContent = `${Math.round(checked / group.entries.length * 1000) / 10}%`
      group.progress.value = checked
      group.progress.setAttribute('aria-valuetext', `${group.entries.length}体中${checked}体`)
    }
    error.hidden = store.persistent
  }

  const sync = () => {
    const checked = store.read()
    for (const entry of entries) {
      entry.input.checked = checked.has(entry.id)
      entry.row.classList.toggle('pet-checked', entry.input.checked)
    }
    updateCounts()
  }

  table.addEventListener('change', (event) => {
    const input = event.target
    if (!(input instanceof HTMLInputElement) || !input.dataset.monsterId) return
    store.setChecked(input.dataset.monsterId, input.checked)
    sync()
  }, { signal: controller.signal })
  table.addEventListener('dex-filter-change', updateCounts, { signal: controller.signal })
  window.addEventListener('storage', (event) => {
    if (event.storageArea === storage && (event.key === PET_CHECKLIST_STORAGE_KEY || event.key === null)) sync()
  }, { signal: controller.signal })
  window.addEventListener('pageshow', sync, { signal: controller.signal })
  sync()
  active = { table, dispose: () => controller.abort() }
}
