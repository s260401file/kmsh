// evacuationApi.js — 避難圖 API 客戶端
// 角色：封裝對自建 .NET 後端 /api/Evacuation 的呼叫，分三組：
//       圖片(image)、避難設備清單(equipment)、緊急聯絡(contact)。
// 慣例：unitCode 指定單位；includeAll=true 連同停用資料一併取回（後台管理用）。
import { apiFetch } from './http'

const BASE = '/api/Evacuation'
const json = { 'Content-Type': 'application/json' }

// 統一處理回應：204 回傳 null；非 2xx 丟出錯誤；其餘解析 JSON
async function handle(res) {
  if (res.status === 204) return null
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`) }
  return res.json()
}

// ── 圖片 ──────────────────────────────────────────────────────────
// 組出圖片直接讀取的 URL（GET /api/Evacuation/image/{unitCode}），給 <img src> 用
export function imageUrl(unitCode) { return `${BASE}/image/${unitCode}` }

// GET /api/Evacuation/image/info/{unitCode} → 取得圖片中繼資料（檔名/上傳時間）；無圖回 null
export async function getImageInfo(unitCode) {
  const res = await apiFetch(`${BASE}/image/info/${unitCode}`)
  if (res.status === 404) return null
  return handle(res)
}

// POST /api/Evacuation/image → 以 multipart/form-data 上傳該單位的避難圖
export async function uploadImage(unitCode, file) {
  const form = new FormData()
  form.append('unitCode', unitCode)
  form.append('file', file)
  return handle(await apiFetch(`${BASE}/image`, { method: 'POST', body: form }))
}

// DELETE /api/Evacuation/image/{unitCode} → 刪除該單位的避難圖
export async function deleteImage(unitCode) {
  return handle(await apiFetch(`${BASE}/image/${unitCode}`, { method: 'DELETE' }))
}

// ── 設備清單 ──────────────────────────────────────────────────────
// GET /api/Evacuation/equipment?unitCode=&includeAll= → 取得避難設備清單
export async function getEquipment(unitCode, includeAll = false) {
  const p = new URLSearchParams({ unitCode })
  if (includeAll) p.append('includeAll', 'true')
  return handle(await apiFetch(`${BASE}/equipment?${p}`))
}
// POST /api/Evacuation/equipment → 新增設備
export async function createEquipment(data) {
  return handle(await apiFetch(`${BASE}/equipment`, { method: 'POST', headers: json, body: JSON.stringify(data) }))
}
// PUT /api/Evacuation/equipment/{id} → 更新指定設備
export async function updateEquipment(id, data) {
  return handle(await apiFetch(`${BASE}/equipment/${id}`, { method: 'PUT', headers: json, body: JSON.stringify(data) }))
}
// DELETE /api/Evacuation/equipment/{id} → 刪除指定設備
export async function removeEquipment(id) {
  return handle(await apiFetch(`${BASE}/equipment/${id}`, { method: 'DELETE' }))
}

// ── 緊急聯絡 ──────────────────────────────────────────────────────
// GET /api/Evacuation/contact?unitCode=&includeAll= → 取得緊急聯絡清單
export async function getContact(unitCode, includeAll = false) {
  const p = new URLSearchParams({ unitCode })
  if (includeAll) p.append('includeAll', 'true')
  return handle(await apiFetch(`${BASE}/contact?${p}`))
}
// POST /api/Evacuation/contact → 新增緊急聯絡
export async function createContact(data) {
  return handle(await apiFetch(`${BASE}/contact`, { method: 'POST', headers: json, body: JSON.stringify(data) }))
}
// PUT /api/Evacuation/contact/{id} → 更新指定緊急聯絡
export async function updateContact(id, data) {
  return handle(await apiFetch(`${BASE}/contact/${id}`, { method: 'PUT', headers: json, body: JSON.stringify(data) }))
}
// DELETE /api/Evacuation/contact/{id} → 刪除指定緊急聯絡
export async function removeContact(id) {
  return handle(await apiFetch(`${BASE}/contact/${id}`, { method: 'DELETE' }))
}
