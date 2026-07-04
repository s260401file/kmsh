// http.js — 共用 fetch 包裝
// 自動帶 Authorization: Bearer {token}（登入後存於 localStorage wb_auth）。
// 後端對所有修改類請求（POST/PUT/DELETE）要求有效 JWT；白板 GET 免登入、帶了也無妨。
// 收到 401 且本地有 token（＝token 過期/無效）時：清除登入並廣播 wb-unauthorized，
// 由 AuthContext 監聽登出，ProtectedRoute 自然導回 /login。
const STORAGE_KEY = 'wb_auth'

export function getToken() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')?.token ?? null } catch { return null }
}

export async function apiFetch(url, init = {}) {
  const token = getToken()
  const headers = { ...(init.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, { ...init, headers })
  if (res.status === 401 && token) {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new Event('wb-unauthorized'))
  }
  return res
}
