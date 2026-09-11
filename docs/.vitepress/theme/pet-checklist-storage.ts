export const PET_CHECKLIST_STORAGE_KEY = 'dqmvi-wiki:pet-checklist:v1'

export type PetChecklistStore = {
  read(): Set<string>
  setChecked(id: string, checked: boolean): boolean
  readonly persistent: boolean
}

const validId = (id: unknown): id is string => typeof id === 'string' && /^[a-z0-9][a-z0-9_-]{0,127}$/.test(id)

function decode(raw: string | null): Set<string> | null {
  if (raw === null) return new Set()
  if (raw.length > 2_000_000) return null
  try {
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object' || Array.isArray(data)
      || !Object.hasOwn(data, 'version') || !Object.hasOwn(data, 'checked')) return null
    const value = data as { version: unknown; checked: unknown }
    if (value.version !== 1 || !Array.isArray(value.checked)
      || value.checked.length > 10_000 || !value.checked.every(validId)) return null
    return new Set(value.checked)
  } catch {
    return null
  }
}

export function createPetChecklistStore(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null,
  key = PET_CHECKLIST_STORAGE_KEY
): PetChecklistStore {
  let saved = new Set<string>()
  const pending = new Map<string, boolean>()
  let persistent = false

  const refresh = (): boolean => {
    if (!storage) { persistent = false; return false }
    try {
      const value = decode(storage.getItem(key))
      if (!value) { persistent = false; return false }
      saved = value
      for (const [id, checked] of pending) {
        if (saved.has(id) === checked) pending.delete(id)
      }
      persistent = pending.size === 0
      return true
    } catch {
      persistent = false
      return false
    }
  }

  const current = (): Set<string> => {
    const value = new Set(saved)
    for (const [id, checked] of pending) {
      if (checked) value.add(id)
      else value.delete(id)
    }
    return value
  }

  return {
    read() {
      refresh()
      return current()
    },
    setChecked(id, checked) {
      if (!validId(id) || typeof checked !== 'boolean') return false
      const readable = refresh()
      pending.set(id, checked)
      persistent = false
      if (!readable || !storage) return false
      const value = current()
      if (value.size > 10_000) return false
      try {
        storage.setItem(key, JSON.stringify({ version: 1, checked: [...value].sort() }))
        saved = value
        pending.clear()
        persistent = true
        return true
      } catch {
        return false
      }
    },
    get persistent() {
      return persistent
    }
  }
}
