// boardImageApi.js — 通用看板圖片 API 客戶端（後端 /api/BoardImage，以 kind＋unitCode 為鍵）
// 用途：各種「上傳一張圖、整頁顯示」的頁籤，如 OR 各科協助業務（kind='assist'）。
import { apiFetch } from './http'

const BASE = '/api/BoardImage'

async function handle(res) {
  if (res.status === 204) return null
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`) }
  return res.json()
}

// 圖片直接讀取 URL（GET /api/BoardImage/image/{kind}/{unitCode}），給 <img src> 用
export function imageUrl(kind, unitCode) { return `${BASE}/image/${kind}/${unitCode}` }

// 圖片中繼資料（檔名/上傳時間）；無圖回 null
export async function getImageInfo(kind, unitCode) {
  const res = await apiFetch(`${BASE}/image/info/${kind}/${unitCode}`)
  if (res.status === 404) return null
  return handle(res)
}

// 上傳（multipart/form-data）
export async function uploadImage(kind, unitCode, file) {
  const form = new FormData()
  form.append('kind', kind)
  form.append('unitCode', unitCode)
  form.append('file', file)
  return handle(await apiFetch(`${BASE}/image`, { method: 'POST', body: form }))
}

// 刪除
export async function deleteImage(kind, unitCode) {
  return handle(await apiFetch(`${BASE}/image/${kind}/${unitCode}`, { method: 'DELETE' }))
}
