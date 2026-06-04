const BASE = '/api/Text'

const headers = { 'Content-Type': 'application/json' }

async function handleResponse(res) {
  if (res.status === 204) return null
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function getAll(unitCode = '', category = '', includeAll = false) {
  const params = new URLSearchParams()
  if (unitCode)   params.append('unitCode', unitCode)
  if (category)   params.append('category', category)
  if (includeAll) params.append('includeAll', 'true')
  const res = await fetch(`${BASE}?${params}`)
  return handleResponse(res)
}

export async function getById(id) {
  const res = await fetch(`${BASE}/${id}`)
  return handleResponse(res)
}

export async function create(data) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function update(id, data) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function remove(id) {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
  return handleResponse(res)
}
