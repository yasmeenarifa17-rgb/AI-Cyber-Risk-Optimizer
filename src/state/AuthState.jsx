/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createFirebaseSession, fetchMe, logout as apiLogout } from '../api/client'
import { createFirebaseOrganizationUser, ensureFirebaseOrganizationProfile, firebaseAuth, firebaseConfigured, getFirebaseIdToken, getFirebaseOrganizationProfile, onAuthStateChanged, signInFirebaseUser, signOutFirebaseUser } from '../firebase'

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

  // Wait for Firebase restoration before validating the application session.
  useEffect(() => {
    let cancelled = false
    const validateBackendSession = (firebaseUser = null) => {
      const token = sessionStorage.getItem('auth_token')
      if (firebaseConfigured && (!firebaseUser || firebaseUser.isAnonymous)) {
        sessionStorage.removeItem('auth_token')
        setUser(null)
        setOrganization(null)
        setBootstrapping(false)
        return
      }
      if (!token) {
        setBootstrapping(false)
        return
      }
      fetchMe()
        .then(({ user, organization }) => {
          if (!cancelled) { setUser(user); setOrganization(organization) }
        })
        .catch(() => { sessionStorage.removeItem('auth_token') })
        .finally(() => { if (!cancelled) setBootstrapping(false) })
    }

    if (!firebaseConfigured || !firebaseAuth) {
      validateBackendSession()
      return () => { cancelled = true }
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, firebaseUser => validateBackendSession(firebaseUser))
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const login = useCallback(async (email, password) => {
    if (!firebaseConfigured) throw new Error('Firebase is not configured. Organization login is unavailable until the Vite server is restarted with VITE_FIREBASE_* variables.')
    sessionStorage.removeItem('auth_token')
    const firebaseUser = await signInFirebaseUser(email, password)
    const firebaseProfile = await getFirebaseOrganizationProfile(firebaseUser)
    const idToken = await getFirebaseIdToken(firebaseUser)
    const data = await createFirebaseSession(idToken, {
      name: firebaseProfile?.fullName || firebaseUser.displayName || email,
      email: firebaseUser.email ?? email,
      organization_name: firebaseProfile?.organizationName,
      organization_type: firebaseProfile?.organizationType || 'Enterprise',
    })
    await ensureFirebaseOrganizationProfile(firebaseUser, {
      name: data.user?.name || firebaseUser.displayName,
      email: data.user?.email ?? firebaseUser.email ?? email,
      organizationName: data.organization?.organization_name,
      organizationType: data.organization?.organization_type,
    })
    sessionStorage.setItem('auth_token', data.token)
    setUser(data.user)
    setOrganization(data.organization)
  }, [])

  const register = useCallback(async (name, email, password, organization_name, organization_type) => {
    sessionStorage.removeItem('auth_token')
    const firebaseUser = await createFirebaseOrganizationUser({ name, email, password, organizationName: organization_name, organizationType: organization_type })
    const idToken = await getFirebaseIdToken(firebaseUser)
    const data = await createFirebaseSession(idToken, {
      name,
      email,
      organization_name,
      organization_type,
    })
    sessionStorage.setItem('auth_token', data.token)
    setUser(data.user)
    setOrganization(data.organization)
  }, [])

  const logout = useCallback(async () => {
    try { await apiLogout() } catch { /* ignore */ }
    try { await signOutFirebaseUser() } catch { /* ignore */ }
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
