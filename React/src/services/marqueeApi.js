// marqueeApi.js — 跑馬燈 API 客戶端
// 角色：跑馬燈訊息本質上是 category='marquee' 的「文字資料」，因此沿用
//       後端共用的 /api/Text 端點；此檔等於 textApi 的跑馬燈專用包裝。
//       白板端用 getActive 取顯示文字，後台用 getAll/create/update/remove 管理。
const BASE = '/api/Text'

// 統一處理回應：204 回傳 null；非 2xx 丟出錯誤；其餘解析 JSON
async function handleResponse(res) {
  if (res.status === 204) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// GET /api/Text?unitCode=&category=marquee → 取得指定科別啟用中的跑馬燈（白板顯示用）
export async function getActive(unitCode) {
  const params = new URLSearchParams({ unitCode, category: 'marquee' })
  const res = await fetch(`${BASE}?${params}`)
  return handleResponse(res)
}

// GET /api/Text?unitCode=&category=marquee → 取得指定科別所有跑馬燈（管理後台用）
export async function getAll(unitCode) {
  const params = new URLSearchParams({ unitCode, category: 'marquee' })
  const res = await fetch(`${BASE}?${params}`)
  return handleResponse(res)
}

// POST /api/Text → 新增跑馬燈；自動補上 unitCode 與 category='marquee'
export async function create(unitCode, data) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, unitCode, category: 'marquee' }),
  })
  return handleResponse(res)
}

// PUT /api/Text/{id} → 更新指定跑馬燈（呼叫端負責帶齊 data 欄位）
export async function update(id, data) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// DELETE /api/Text/{id} → 刪除指定跑馬燈
export async function remove(id) {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
  return handleResponse(res)
}
