import assert from 'node:assert/strict'
import test from 'node:test'
import { createPetChecklistStore, PET_CHECKLIST_STORAGE_KEY } from './pet-checklist-storage.ts'

const key = PET_CHECKLIST_STORAGE_KEY
const encode = (checked: string[]) => JSON.stringify({ version: 1, checked })
const sorted = (value: Set<string>) => [...value].sort()

class MemoryStorage {
  data = new Map<string, string>()
  reads: string[] = []
  writes: string[] = []
  readError = false
  writeError = false

  getItem(key: string): string | null {
    this.reads.push(key)
    if (this.readError) throw new Error('Storage read denied')
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.writes.push(key)
    if (this.writeError) throw new Error('Storage write denied')
    this.data.set(key, value)
  }
}

test('stable IDs survive reload and individual removal without touching other settings', () => {
  const storage = new MemoryStorage()
  storage.data.set('vitepress-theme-appearance', 'dark')
  const store = createPetChecklistStore(storage)
  assert.deepEqual(sorted(store.read()), [])
  assert.equal(store.persistent, true)
  assert.equal(store.setChecked('suraimu', true), true)
  assert.equal(store.setChecked('metal_suraimu', true), true)
  assert.equal(store.setChecked('suraimu', true), true)
  assert.deepEqual(JSON.parse(storage.data.get(key)!), { version: 1, checked: ['metal_suraimu', 'suraimu'] })

  const reloaded = createPetChecklistStore(storage)
  assert.deepEqual(sorted(reloaded.read()), ['metal_suraimu', 'suraimu'])
  assert.equal(reloaded.setChecked('suraimu', false), true)
  assert.deepEqual(sorted(createPetChecklistStore(storage).read()), ['metal_suraimu'])
  assert.equal(storage.data.get('vitepress-theme-appearance'), 'dark')
  assert.ok(storage.reads.every((value) => value === key))
  assert.ok(storage.writes.every((value) => value === key))
})

test('read returns a defensive copy and deduplicates stored IDs without rewriting', () => {
  const storage = new MemoryStorage()
  storage.data.set(key, encode(['suraimu', 'suraimu']))
  const store = createPetChecklistStore(storage)
  const copy = store.read()
  copy.clear()
  copy.add('doragon')
  assert.deepEqual(sorted(store.read()), ['suraimu'])
  assert.deepEqual(storage.writes, [])
})

test('corrupt JSON, incompatible schema and unsafe IDs stay untouched while memory remains usable', async (t) => {
  const invalid = [
    '{', 'null', '[]', '{}', JSON.stringify({ version: 2, checked: ['suraimu'] }),
    JSON.stringify({ version: 1, checked: {} }), JSON.stringify({ version: 1, checked: [7] }),
    encode(['suraimu', '../settings']), encode(['<script>']), encode(['__proto__']),
    encode(['bad\nid']), encode(['a'.repeat(129)]), encode(Array(10_001).fill('suraimu')),
    ' '.repeat(2_000_001)
  ]
  for (const [index, raw] of invalid.entries()) {
    await t.test(`invalid payload ${index + 1}`, () => {
      const storage = new MemoryStorage()
      storage.data.set(key, raw)
      const store = createPetChecklistStore(storage)
      assert.deepEqual(sorted(store.read()), [])
      assert.equal(store.persistent, false)
      assert.equal(store.setChecked('suraimu', true), false)
      assert.deepEqual(sorted(store.read()), ['suraimu'])
      assert.equal(store.setChecked('suraimu', false), false)
      assert.deepEqual(sorted(store.read()), [])
      assert.equal(storage.data.get(key), raw)
      assert.deepEqual(storage.writes, [])
    })
  }
})

test('invalid update IDs and nonboolean states cannot alter stored or in-memory data', () => {
  const storage = new MemoryStorage()
  storage.data.set(key, encode(['suraimu']))
  const store = createPetChecklistStore(storage)
  for (const id of ['', '../theme', '<img>', '__proto__', 'white space', 'bad\nid', 'a'.repeat(129)]) {
    assert.equal(store.setChecked(id, true), false)
  }
  assert.equal(store.setChecked('doragon', 'true' as unknown as boolean), false)
  assert.deepEqual(sorted(store.read()), ['suraimu'])
  assert.deepEqual(storage.writes, [])
})

test('write failures retain additions and removals across reads and later merge fresh tab data', () => {
  const storage = new MemoryStorage()
  storage.data.set(key, encode(['suraimu', 'doragon']))
  const local = createPetChecklistStore(storage)
  assert.deepEqual(sorted(local.read()), ['doragon', 'suraimu'])
  storage.writeError = true
  assert.equal(local.setChecked('suraimu', false), false)
  assert.equal(local.setChecked('maaburun', true), false)
  assert.deepEqual(sorted(local.read()), ['doragon', 'maaburun'])
  assert.equal(local.persistent, false)

  storage.writeError = false
  const otherTab = createPetChecklistStore(storage)
  assert.equal(otherTab.setChecked('doragon', false), true)
  assert.equal(otherTab.setChecked('hatonaito', true), true)
  assert.deepEqual(sorted(local.read()), ['hatonaito', 'maaburun'])
  assert.equal(local.persistent, false)
  assert.equal(local.setChecked('kiratoti', true), true)
  assert.equal(local.persistent, true)
  assert.deepEqual(sorted(createPetChecklistStore(storage).read()), ['hatonaito', 'kiratoti', 'maaburun'])
})

test('two stores refresh before writing so stale tabs preserve unrelated changes', () => {
  const storage = new MemoryStorage()
  const first = createPetChecklistStore(storage)
  const second = createPetChecklistStore(storage)
  first.read()
  second.read()
  assert.equal(first.setChecked('suraimu', true), true)
  assert.equal(second.setChecked('doragon', true), true)
  assert.equal(first.setChecked('maaburun', true), true)
  assert.equal(second.setChecked('suraimu', false), true)
  assert.deepEqual(sorted(first.read()), ['doragon', 'maaburun'])
  assert.deepEqual(sorted(second.read()), ['doragon', 'maaburun'])
})

test('read failures retain cached data and prevent blind writes over another tab', () => {
  const storage = new MemoryStorage()
  storage.data.set(key, encode(['suraimu']))
  const store = createPetChecklistStore(storage)
  store.read()
  storage.readError = true
  assert.equal(store.setChecked('doragon', true), false)
  assert.equal(store.persistent, false)
  assert.deepEqual(sorted(store.read()), ['doragon', 'suraimu'])
  assert.deepEqual(storage.writes, [])

  storage.data.set(key, encode(['hatonaito']))
  storage.readError = false
  assert.deepEqual(sorted(store.read()), ['doragon', 'hatonaito'])
  assert.equal(store.persistent, false)
  assert.equal(store.setChecked('maaburun', true), true)
  assert.deepEqual(sorted(createPetChecklistStore(storage).read()), ['doragon', 'hatonaito', 'maaburun'])
})

test('corruption after a successful read preserves the last good snapshot and local changes', () => {
  const storage = new MemoryStorage()
  storage.data.set(key, encode(['suraimu']))
  const store = createPetChecklistStore(storage)
  store.read()
  storage.data.set(key, '{broken')
  assert.deepEqual(sorted(store.read()), ['suraimu'])
  assert.equal(store.setChecked('suraimu', false), false)
  assert.equal(store.setChecked('doragon', true), false)
  assert.deepEqual(sorted(store.read()), ['doragon'])
  assert.equal(storage.data.get(key), '{broken')

  storage.data.set(key, encode(['suraimu', 'hatonaito']))
  assert.deepEqual(sorted(store.read()), ['doragon', 'hatonaito'])
  assert.equal(store.setChecked('maaburun', true), true)
  assert.deepEqual(sorted(createPetChecklistStore(storage).read()), ['doragon', 'hatonaito', 'maaburun'])
})

test('a matching external save acknowledges pending changes without another write', () => {
  const storage = new MemoryStorage()
  const store = createPetChecklistStore(storage)
  storage.writeError = true
  assert.equal(store.setChecked('suraimu', true), false)
  assert.equal(store.persistent, false)
  storage.data.set(key, encode(['suraimu', 'doragon']))
  const attempts = storage.writes.length
  assert.deepEqual(sorted(store.read()), ['doragon', 'suraimu'])
  assert.equal(store.persistent, true)
  assert.equal(storage.writes.length, attempts)
})

test('null storage supports in-memory checks and removals without throwing', () => {
  const store = createPetChecklistStore(null)
  assert.deepEqual(sorted(store.read()), [])
  assert.equal(store.setChecked('suraimu', true), false)
  assert.deepEqual(sorted(store.read()), ['suraimu'])
  assert.equal(store.setChecked('suraimu', false), false)
  assert.deepEqual(sorted(store.read()), [])
  assert.equal(store.persistent, false)
})

test('an explicit namespace remains isolated from the default checklist key', () => {
  const storage = new MemoryStorage()
  const alternate = `${key}:test`
  storage.data.set(key, encode(['suraimu']))
  const store = createPetChecklistStore(storage, alternate)
  assert.equal(store.setChecked('doragon', true), true)
  assert.deepEqual(JSON.parse(storage.data.get(alternate)!), { version: 1, checked: ['doragon'] })
  assert.equal(storage.data.get(key), encode(['suraimu']))
  assert.ok(storage.reads.every((value) => value === alternate))
  assert.ok(storage.writes.every((value) => value === alternate))
})

test('an update beyond the schema limit stays in memory without writing unreadable data', () => {
  const storage = new MemoryStorage()
  const stored = encode(Array.from({ length: 10_000 }, (_, index) => `monster_${index}`))
  storage.data.set(key, stored)
  const store = createPetChecklistStore(storage)
  assert.equal(store.read().size, 10_000)
  assert.equal(store.setChecked('additional_monster', true), false)
  assert.equal(store.read().has('additional_monster'), true)
  assert.equal(store.persistent, false)
  assert.equal(storage.data.get(key), stored)
  assert.deepEqual(storage.writes, [])
})
