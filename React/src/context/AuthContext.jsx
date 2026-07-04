/*
 * AuthContext.jsx — 登入狀態管理（Context）
 * 登入以「員編＋密碼」經後端驗證（AD／LDAP 認證），成功後保存後端簽發的 JWT token；
 * 之後所有修改類 API 請求由 services/http.js 的 apiFetch 自動帶 Authorization。
 * 權限的實際強制在後端（無效 token 一律 401）；前端保存的 isAdmin/units 僅供 UI 顯示過濾。
 * 啟動時以 GET personnel/me 向後端驗證 token 並刷新身分；token 失效（401）→ apiFetch
 * 廣播 wb-unauthorized → 此處登出，ProtectedRoute 導回 /login。
 * 對外提供 { role, roleInfo:{label,unitCodes}, isAdmin, login, logout }，
 * 相容 App 守門（role truthy）與 AdminPage（依 unitCodes / isAdmin）。
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { logout as apiLogout, me as apiMe } from '../services/wardApi'

const AuthContext = createContext(null)
const STORAGE_KEY = 'wb_auth'   // 存登入身分＋token（JSON）

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    // 舊版（無 token）的存檔視為未登入，強制重新登入取得 token
    try { const j = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); return j && j.employeeNo && j.token ? j : null } catch { return null }
  })

  const persist = (a) => {
    if (a) localStorage.setItem(STORAGE_KEY, JSON.stringify(a))
    else localStorage.removeItem(STORAGE_KEY)
    setAuth(a)
  }

  // identity（後端 personnel/login 回傳）：{ token, employeeNo, name, isAdmin, units:[...] }
  const login = (identity) => {
    if (!identity || !identity.employeeNo || !identity.token) return
    persist({
      token: identity.token,
      employeeNo: identity.employeeNo,
      name: identity.name || identity.employeeNo,
      isAdmin: !!identity.isAdmin,
      units: identity.units || [],
    })
  }
  const logout = () => {
    if (auth?.employeeNo) apiLogout(auth.employeeNo)   // 寫登出稽核
    persist(null)
  }

  // token 失效（apiFetch 收到 401 已清 localStorage）→ 同步登出狀態
  useEffect(() => {
    const onUnauthorized = () => setAuth(null)
    window.addEventListener('wb-unauthorized', onUnauthorized)
    return () => window.removeEventListener('wb-unauthorized', onUnauthorized)
  }, [])

  // 啟動時驗證 token 並刷新身分（過期 → 401 → 上面的事件登出；網路錯誤則沿用本地快取）
  useEffect(() => {
    if (!auth?.token) return
    apiMe()
      .then(fresh => setAuth(a => {
        if (!a) return a
        const next = { ...a, name: fresh.name || a.name, isAdmin: !!fresh.isAdmin, units: fresh.units || [] }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      }))
      .catch(() => { /* 401 由事件處理；其他錯誤不影響已登入狀態 */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const role = auth ? auth.employeeNo : null                          // 登入即 truthy（供 ProtectedRoute）
  const roleInfo = auth ? { label: auth.name, unitCodes: auth.units } : null
  const isAdmin = !!auth?.isAdmin

  return (
    <AuthContext.Provider value={{ role, roleInfo, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
