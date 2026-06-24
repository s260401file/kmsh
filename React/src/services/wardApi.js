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

// ── 各科值班醫師（ER 面板 + 後台 CRUD）──────────────────────────────
export async function getOnCall(unitCode, includeAll = false) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await fetch(`${BASE}/${unitCode}/oncall?${p}`))
}
export async function createOnCall(data) {
  return handle(await fetch(`${BASE}/oncall`, { method: 'POST', headers, body: JSON.stringify(data) }))
}
export async function updateOnCall(id, data) {
  return handle(await fetch(`${BASE}/oncall/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }))
}
export async function removeOnCall(id) {
  return handle(await fetch(`${BASE}/oncall/${id}`, { method: 'DELETE' }))
}
// ── ER 床位主檔（病室動態平面圖 + 後台 CRUD）──────────────────────
// GET /api/Board/{unitCode}/bed?includeAll= → 該單位 ER 床位主檔（含座標/分區）
export async function getErBeds(unitCode, includeAll = false) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await fetch(`${BASE}/${unitCode}/bed?${p}`))
}
export async function createErBed(data) {
  return handle(await fetch(`${BASE}/bed`, { method: 'POST', headers, body: JSON.stringify(data) }))
}
export async function updateErBed(id, data) {
  return handle(await fetch(`${BASE}/bed/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }))
}
export async function removeErBed(id) {
  return handle(await fetch(`${BASE}/bed/${id}`, { method: 'DELETE' }))
}
// ── OR 刀房主檔（手術動態房卡 + 後台 CRUD）──────────────────────────
// GET /api/Board/{unitCode}/room?includeAll= → 該單位 OR 刀房主檔（RoomId↔ApiRoom 對應）
export async function getOrRooms(unitCode, includeAll = false) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await fetch(`${BASE}/${unitCode}/room?${p}`))
}
export async function createOrRoom(data) {
  return handle(await fetch(`${BASE}/room`, { method: 'POST', headers, body: JSON.stringify(data) }))
}
export async function updateOrRoom(id, data) {
  return handle(await fetch(`${BASE}/room/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }))
}
export async function removeOrRoom(id) {
  return handle(await fetch(`${BASE}/room/${id}`, { method: 'DELETE' }))
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
