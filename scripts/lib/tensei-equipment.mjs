export function normalizeEquipmentKey(key) {
  return String(key ?? '').replace(/^legacy_(?:item|block)_/, '')
}

export function tenseiEquipmentKind(key, equipment) {
  const id = normalizeEquipmentKey(key)
  const weapon = equipment.weapons?.[id]
  if (weapon?.こうげき != null || weapon?.武器種) return '武器'
  if (equipment.armor?.[id]) return '防具'
  if (equipment.shields?.[id]) return '盾'
  if (equipment.accessories?.[id]) return 'アクセサリー'
  return 'その他'
}

export function createTenseiDexOrder(monsters, dexNoById) {
  const order = new Map()
  for (const [id, monster] of Object.entries(monsters ?? {})) {
    const dexNo = Number(dexNoById.get(id))
    if (!Number.isFinite(dexNo) || dexNo <= 0) continue
    for (const drop of monster.drops ?? []) {
      const key = normalizeEquipmentKey(drop.key)
      if (key && dexNo < (order.get(key) ?? Infinity)) order.set(key, dexNo)
    }
  }
  return order
}

export function compareTenseiEquipment(a, b, order) {
  const left = order.get(normalizeEquipmentKey(a)) ?? Infinity
  const right = order.get(normalizeEquipmentKey(b)) ?? Infinity
  return left === right ? 0 : left < right ? -1 : 1
}
