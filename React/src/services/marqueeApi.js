const BASE = '/api/Text'

async function handleResponse(res) {
  if (res.status === 204) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// 取得指定科別的啟用中跑馬燈（只取第一筆）
export async function getActive(unitCode) {
  const params = new URLSearchParams({ unitCode, category: 'marquee' })
  const res = await fetch(`${BASE}?${params}`)
  return handleResponse(res)
}

// 取得指定科別的所有跑馬燈（管理後台用）
export async function getAll(unitCode) {
  const params = new URLSearchParams({ unitCode, category: 'marquee' })
  const res = await fetch(`${BASE}?${params}`)
  return handleResponse(res)
}

export async function create(unitCode, data) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, unitCode, category: 'marquee' }),
  })
  return handleResponse(res)
}

export async function update(id, data) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function remove(id) {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
  return handleResponse(res)
}
