/*
 * AuthContext.jsx — 登入狀態管理（Context）
 * 登入以「員編＋密碼」經後端驗證（AD／LDAP 認證；過渡期 LDAP 未啟用時為員編登入）。
 * 前端保存登入身分（employeeNo/name/isAdmin/units），依 units 過濾後台各群組。
 * 對外提供 { role, roleInfo:{label,unitCodes}, isAdmin, login, logout }，
 * 相容 App 守門（role truthy）與 AdminPage（依 unitCodes / isAdmin）。
 */
import { createContext, useContext, useState } from 'react'
import { logout as apiLogout } from '../services/wardApi'

const AuthContext = createContext(null)
const STORAGE_KEY = 'wb_auth'   // 存登入身分（JSON）

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try { const j = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); return j && j.employeeNo ? j : null } catch { return null }
  })

  // identity（後端 personnel/login 回傳）：{ employeeNo, name, isAdmin, units:[...] }
  const login = (identity) => {
    if (!identity || !identity.employeeNo) return
    const a = {
      employeeNo: identity.employeeNo,
      name: identity.name || identity.employeeNo,
      isAdmin: !!identity.isAdmin,
      units: identity.units || [],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(a))
    setAuth(a)
  }
  const logout = () => {
    if (auth?.employeeNo) apiLogout(auth.employeeNo)   // 寫登出稽核
    localStorage.removeItem(STORAGE_KEY)
    setAuth(null)
  }

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
