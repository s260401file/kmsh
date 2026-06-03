import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'wb_role'

export const ROLES = {
  admin: { label: '管理員', unitCodes: ['W52', 'ICU', 'OR', 'ER'] },
  w52:   { label: 'W52 病房', unitCodes: ['W52'] },
  icu:   { label: 'ICU 加護', unitCodes: ['ICU'] },
  or:    { label: 'OR 手術室', unitCodes: ['OR'] },
  er:    { label: 'ER 急診室', unitCodes: ['ER'] },
}

export function AuthProvider({ children }) {
  const [role, setRole] = useState(() => localStorage.getItem(STORAGE_KEY))

  const login = (r) => {
    localStorage.setItem(STORAGE_KEY, r)
    setRole(r)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setRole(null)
  }

  return (
    <AuthContext.Provider value={{ role, login, logout, roleInfo: ROLES[role] ?? null }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
