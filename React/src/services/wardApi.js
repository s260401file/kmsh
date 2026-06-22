// wardApi.js — 病室動態 API 客戶端
// 角色：取各站病室動態看板（後端聚合 Board_bed 真實在床 ＋ 自建臨床補充層）；
//       另含臨床補充層(WardPatientExt)的後台 CRUD。後端端點前綴 /api/Board。
const BASE = '/api/Board'
const headers = { 'Content-Type': 'application/json' }

async function handle(res) {
  if (res.status === 204) return null
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`) }
  return res.json()
}

// GET /api/Board/w52 → 病室動態看板（{ HospitalInfo, Version, Beds[] }，PascalCase 貼合 WardTab）
export async function getBoard(unitCode) {
  return handle(await fetch(`${BASE}/${unitCode.toLowerCase()}`))
}

// ── 臨床補充層 CRUD（後台用）──────────────────────────────────────
// GET /api/Board/{unitCode}/ext?includeAll= → 該單位臨床補充列
export async function getExt(unitCode, includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await fetch(`${BASE}/${unitCode}/ext?${p}`))
}
// GET /api/Board/{unitCode}/occupancy → 目前在床對照 [{hhisnum, bed}]（標示在床/已離床）
export async function getOccupancy(unitCode) {
  return handle(await fetch(`${BASE}/${unitCode}/occupancy`))
}
export async function createExt(data) {
  return handle(await fetch(`${BASE}/ext`, { method: 'POST', headers, body: JSON.stringify(data) }))
}
export async function updateExt(id, data) {
  return handle(await fetch(`${BASE}/ext/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }))
}
export async function removeExt(id) {
  return handle(await fetch(`${BASE}/ext/${id}`, { method: 'DELETE' }))
}
