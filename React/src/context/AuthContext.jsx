/*
 * AuthContext.jsx — 登入狀態管理（Context）
 * 後台僅 5 個固定帳號可登入：admin（全權）、w52/icu/or/er（各自單位）。
 * 現階段免密碼（點選帳號即登入），真帳密驗證為待辦。
 * 對外提供 { role, roleInfo:{label,unitCodes}, isAdmin, login, logout }，
 * 相容 AdminPage（依 unitCodes 過濾各群組）與 App 守門（role truthy）。
 */
import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)
const STORAGE_KEY = 'wb_role'   // 存登入角色 key

// 5 個固定帳號：label 顯示名稱、unitCodes 可管理單位、isAdmin 是否系統管理員
export const ROLES = {
  admin: { label: '管理員', unitCodes: ['W52', 'ICU', 'OR', 'ER'], isAdmin: true },
  w52:   { label: 'W52 病房', unitCodes: ['W52'] },
  icu:   { label: 'ICU 加護', unitCodes: ['ICU'] },
  or:    { label: 'OR 手術室', unitCodes: ['OR'] },
  er:    { label: 'ER 急診室', unitCodes: ['ER'] },
}

export function AuthProvider({ children }) {
  // role：目前登入角色 key（admin/w52/icu/or/er）；未登入為 null
  const [role, setRole] = useState(() => {
    const r = localStorage.getItem(STORAGE_KEY)
    return r && ROLES[r] ? r : null
  })

  const login = (r) => { if (!ROLES[r]) return; localStorage.setItem(STORAGE_KEY, r); setRole(r) }
  const logout = () => { localStorage.removeItem(STORAGE_KEY); setRole(null) }

  const roleInfo = role ? ROLES[role] : null
  const isAdmin = role === 'admin'

  return (
    <AuthContext.Provider value={{ role, roleInfo, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
