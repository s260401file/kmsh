// textApi.js — 文字資料 API 客戶端
// 角色：封裝後端共用文字端點 /api/Text 的 CRUD。此端點以 category 區分用途
//       （如 marquee 跑馬燈、bulletin_unit 科內公告、bulletin_hosp 院方公告），
//       由佈告欄管理與 TestPage 等共用。
import { apiFetch } from './http'

const BASE = '/api/Text'

const headers = { 'Content-Type': 'application/json' }

// 統一處理回應：204 回傳 null；非 2xx 取錯誤訊息丟出；其餘解析 JSON
async function handleResponse(res) {
  if (res.status === 204) return null
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

// GET /api/Text?unitCode=&category=&includeAll= → 依條件查詢文字清單（空字串參數不帶上）
export async function getAll(unitCode = '', category = '', includeAll = false) {
  const params = new URLSearchParams()
  if (unitCode)   params.append('unitCode', unitCode)
  if (category)   params.append('category', category)
  if (includeAll) params.append('includeAll', 'true')
  const res = await apiFetch(`${BASE}?${params}`)
  return handleResponse(res)
}

// GET /api/Text/{id} → 取得單筆文字資料
export async function getById(id) {
  const res = await apiFetch(`${BASE}/${id}`)
  return handleResponse(res)
}

// POST /api/Text → 新增文字資料（data 須含 category / unitCode 等欄位）
export async function create(data) {
  const res = await apiFetch(BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// PUT /api/Text/{id} → 更新指定文字資料
export async function update(id, data) {
  const res = await apiFetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// DELETE /api/Text/{id} → 刪除指定文字資料
export async function remove(id) {
  const res = await apiFetch(`${BASE}/${id}`, { method: 'DELETE' })
  return handleResponse(res)
}
