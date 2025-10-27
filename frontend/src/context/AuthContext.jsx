import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Restore session if present
    const raw = localStorage.getItem('tj_user')
    if (raw) setUser(JSON.parse(raw))
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    setUser(res.data.user)
    localStorage.setItem('tj_user', JSON.stringify(res.data.user))
    return res.data.user
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('tj_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
