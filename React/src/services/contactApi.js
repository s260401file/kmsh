// contactApi.js — 連絡資訊 API 客戶端
// 角色：封裝對自建 .NET 後端 /api/Contact 的呼叫，分「值班人員(duty)」與
//       「常用電話(common)」兩組 CRUD，供後台 AdminPage 與各站白板使用。
// 慣例：unitCode 指定單位；includeAll=true 時連同停用資料一併取回（後台管理用）。
import { apiFetch } from './http'

const BASE = '/api/Contact'
const headers = { 'Content-Type': 'application/json' }

// 統一處理回應：204 視為無內容回傳 null；非 2xx 丟出錯誤；其餘解析 JSON
async function handle(res) {
  if (res.status === 204) return null
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`) }
  return res.json()
}

// ── 值班人員 ──────────────────────────────────────────────────────
// GET /api/Contact/duty?unitCode=&includeAll= → 取得單位值班人員清單
export async function getDuty(unitCode, includeAll = false) {
  const p = new URLSearchParams({ unitCode })
  if (includeAll) p.append('includeAll', 'true')
  return handle(await apiFetch(`${BASE}/duty?${p}`))
}

// POST /api/Contact/duty → 新增值班人員（data 為 JSON 物件）
export async function createDuty(data) {
  return handle(await apiFetch(`${BASE}/duty`, { method: 'POST', headers, body: JSON.stringify(data) }))
}

// PUT /api/Contact/duty/{id} → 更新指定值班人員
export async function updateDuty(id, data) {
  return handle(await apiFetch(`${BASE}/duty/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }))
}

// DELETE /api/Contact/duty/{id} → 刪除指定值班人員
export async function removeDuty(id) {
  return handle(await apiFetch(`${BASE}/duty/${id}`, { method: 'DELETE' }))
}

// ── 常用電話 ──────────────────────────────────────────────────────
// GET /api/Contact/common?unitCode=&includeAll= → 取得單位常用電話清單
export async function getCommon(unitCode, includeAll = false) {
  const p = new URLSearchParams({ unitCode })
  if (includeAll) p.append('includeAll', 'true')
  return handle(await apiFetch(`${BASE}/common?${p}`))
}

// POST /api/Contact/common → 新增常用電話
export async function createCommon(data) {
  return handle(await apiFetch(`${BASE}/common`, { method: 'POST', headers, body: JSON.stringify(data) }))
}

// PUT /api/Contact/common/{id} → 更新指定常用電話
export async function updateCommon(id, data) {
  return handle(await apiFetch(`${BASE}/common/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }))
}

// DELETE /api/Contact/common/{id} → 刪除指定常用電話
export async function removeCommon(id) {
  return handle(await apiFetch(`${BASE}/common/${id}`, { method: 'DELETE' }))
}
