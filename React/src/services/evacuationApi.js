const BASE = '/api/Evacuation'
const json = { 'Content-Type': 'application/json' }

async function handle(res) {
  if (res.status === 204) return null
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`) }
  return res.json()
}

// ── 圖片 ──────────────────────────────────────────────────────────
export function imageUrl(unitCode) { return `${BASE}/image/${unitCode}` }

export async function getImageInfo(unitCode) {
  const res = await fetch(`${BASE}/image/info/${unitCode}`)
  if (res.status === 404) return null
  return handle(res)
}

export async function uploadImage(unitCode, file) {
  const form = new FormData()
  form.append('unitCode', unitCode)
  form.append('file', file)
  return handle(await fetch(`${BASE}/image`, { method: 'POST', body: form }))
}

export async function deleteImage(unitCode) {
  return handle(await fetch(`${BASE}/image/${unitCode}`, { method: 'DELETE' }))
}

// ── 設備清單 ──────────────────────────────────────────────────────
export async function getEquipment(unitCode, includeAll = false) {
  const p = new URLSearchParams({ unitCode })
  if (includeAll) p.append('includeAll', 'true')
  return handle(await fetch(`${BASE}/equipment?${p}`))
}
export async function createEquipment(data) {
  return handle(await fetch(`${BASE}/equipment`, { method: 'POST', headers: json, body: JSON.stringify(data) }))
}
export async function updateEquipment(id, data) {
  return handle(await fetch(`${BASE}/equipment/${id}`, { method: 'PUT', headers: json, body: JSON.stringify(data) }))
}
export async function removeEquipment(id) {
  return handle(await fetch(`${BASE}/equipment/${id}`, { method: 'DELETE' }))
}

// ── 緊急聯絡 ──────────────────────────────────────────────────────
export async function getContact(unitCode, includeAll = false) {
  const p = new URLSearchParams({ unitCode })
  if (includeAll) p.append('includeAll', 'true')
  return handle(await fetch(`${BASE}/contact?${p}`))
}
export async function createContact(data) {
  return handle(await fetch(`${BASE}/contact`, { method: 'POST', headers: json, body: JSON.stringify(data) }))
}
export async function updateContact(id, data) {
  return handle(await fetch(`${BASE}/contact/${id}`, { method: 'PUT', headers: json, body: JSON.stringify(data) }))
}
export async function removeContact(id) {
  return handle(await fetch(`${BASE}/contact/${id}`, { method: 'DELETE' }))
}
