/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { fetchMe, login as apiLogin, logout as apiLogout, register as apiRegister } from '../api/client'

const AuthContext = createContext(null)

/**
 * Provides { user, organization, isAuthenticated, loading, login, register, logout }
 * Token is persisted in sessionStorage so a page refresh keeps the session.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [organization, setOrganization] = useState(null)
  // null = not yet checked, false = checked + unauthenticated, true = authenticated
  const [bootstrapping, setBootstrapping] = useState(true)

  // On mount: if a token is stored, verify it with /api/auth/me
  useEffect(() => {
    const token = sessionStorage.getItem('auth_token')
    if (!token) { setBootstrapping(false); return }
    fetchMe()
      .then(({ user, organization }) => { setUser(user); setOrganization(organization) })
      .catch(() => { sessionStorage.removeItem('auth_token') })
      .finally(() => setBootstrapping(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password)
    sessionStorage.setItem('auth_token', data.token)
    setUser(data.user)
    setOrganization(data.organization)
  }, [])

  const register = useCallback(async (name, email, password, organization_name, organization_type) => {
    const data = await apiRegister(name, email, password, organization_name, organization_type)
    sessionStorage.setItem('auth_token', data.token)
    setUser(data.user)
    setOrganization(data.organization)
  }, [])

  const logout = useCallback(async () => {
    try { await apiLogout() } catch (_) { /* ignore */ }
    sessionStorage.removeItem('auth_token')
    setUser(null)
    setOrganization(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      organization,
      isAuthenticated: !!user,
      bootstrapping,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
