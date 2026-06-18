/*
 * AuthContext.jsx — 登入狀態管理（Context）
 * 以 React Context 提供全站登入角色 role 與 login / logout 方法。
 * 角色採「以單位為基礎」的權限：admin 可看全部單位，其餘各站只看自己單位。
 * 狀態持久化：登入角色存於 localStorage（key = wb_role），重新整理後仍保留登入。
 * 註：目前為簡化的角色機制，尚未串接後端 token 驗證。
 */
import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

// localStorage 鍵名：用於記住目前登入角色
const STORAGE_KEY = 'wb_role'

// 角色定義表：label 為顯示名稱，unitCodes 為該角色可存取的單位清單
export const ROLES = {
  admin: { label: '管理員', unitCodes: ['W52', 'ICU', 'OR', 'ER'] },
  w52:   { label: 'W52 病房', unitCodes: ['W52'] },
  icu:   { label: 'ICU 加護', unitCodes: ['ICU'] },
  or:    { label: 'OR 手術室', unitCodes: ['OR'] },
  er:    { label: 'ER 急診室', unitCodes: ['ER'] },
}

// AuthProvider：包住整個 App，提供登入狀態給所有子元件
// state：role（目前角色字串，初值由 localStorage 還原，未登入為 null）
export function AuthProvider({ children }) {
  const [role, setRole] = useState(() => localStorage.getItem(STORAGE_KEY))

  // login：寫入 localStorage 並更新 state，r 為角色 key（如 'admin'、'w52'）
  const login = (r) => {
    localStorage.setItem(STORAGE_KEY, r)
    setRole(r)
  }

  // logout：清除 localStorage 並把 role 設回 null
  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setRole(null)
  }

  // 對外提供：role、login、logout，及由 role 對應出的 roleInfo（label / unitCodes）
  return (
    <AuthContext.Provider value={{ role, login, logout, roleInfo: ROLES[role] ?? null }}>
      {children}
    </AuthContext.Provider>
  )
}

// useAuth：自訂 hook，讓元件方便取用 AuthContext（role / login / logout / roleInfo）
export function useAuth() {
  return useContext(AuthContext)
}
