import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getAuth, setAuth as persistAuth, type Me, type StoredAuth } from '../lib/api'

type AuthContextValue = {
  auth: StoredAuth | null
  login: (identifier: string, password: string) => Promise<Me>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => getAuth())

  // Refresca el perfil al montar: si vincularon un perfil a esta cuenta,
  // aparece sin necesidad de cerrar sesión.
  useEffect(() => {
    const current = getAuth()
    if (!current) return
    api<Me>('/me')
      .then((me) => {
        const next = { jwt: current.jwt, me }
        persistAuth(next)
        setAuth(next)
      })
      .catch(() => {})
  }, [])

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await api<{ jwt: string }>('/auth/local', {
      method: 'POST',
      body: { identifier, password },
      jwt: '',
    })
    const me = await api<Me>('/me', { jwt: res.jwt })
    const next = { jwt: res.jwt, me }
    persistAuth(next)
    setAuth(next)
    return me
  }, [])

  const logout = useCallback(() => {
    persistAuth(null)
    setAuth(null)
  }, [])

  const value = useMemo(() => ({ auth, login, logout }), [auth, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
