const BASE = '/api/Contact'
const headers = { 'Content-Type': 'application/json' }

async function handle(res) {
  if (res.status === 204) return null
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`) }
  return res.json()
}

// ── 值班人員 ──────────────────────────────────────────────────────
export async function getDuty(unitCode, includeAll = false) {
  const p = new URLSearchParams({ unitCode })
  if (includeAll) p.append('includeAll', 'true')
  return handle(await fetch(`${BASE}/duty?${p}`))
}

export async function createDuty(data) {
  return handle(await fetch(`${BASE}/duty`, { method: 'POST', headers, body: JSON.stringify(data) }))
}

export async function updateDuty(id, data) {
  return handle(await fetch(`${BASE}/duty/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }))
}

export async function removeDuty(id) {
  return handle(await fetch(`${BASE}/duty/${id}`, { method: 'DELETE' }))
}

// ── 常用電話 ──────────────────────────────────────────────────────
export async function getCommon(unitCode, includeAll = false) {
  const p = new URLSearchParams({ unitCode })
  if (includeAll) p.append('includeAll', 'true')
  return handle(await fetch(`${BASE}/common?${p}`))
}

export async function createCommon(data) {
  return handle(await fetch(`${BASE}/common`, { method: 'POST', headers, body: JSON.stringify(data) }))
}

export async function updateCommon(id, data) {
  return handle(await fetch(`${BASE}/common/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }))
}

export async function removeCommon(id) {
  return handle(await fetch(`${BASE}/common/${id}`, { method: 'DELETE' }))
}
