import { createContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { login as apiLogin, logout as apiLogout, type AuthUser, type UserRole } from '@/api/auth'

export interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string, totpToken?: string) => Promise<{ requires2FA?: boolean }>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextType | null>(null)

const ROLE_REDIRECTS: Record<UserRole, string> = {
  superadmin: '/super-admin',
  admin: '/admin/dashboard',
  doctor: '/doctor',
  lab_technician: '/lab',
  patient: '/patient',
  user: '/patient',
  guest: '/booking',
}

export function getRedirectPath(role: UserRole): string {
  return ROLE_REDIRECTS[role] || '/patient'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [])

  useEffect(() => {
    const handleExpired = () => {
      setUser(null)
      localStorage.removeItem('user')
      localStorage.removeItem('tenant_id')
    }
    window.addEventListener('auth:expired', handleExpired)
    return () => window.removeEventListener('auth:expired', handleExpired)
  }, [])

  const login = useCallback(async (email: string, password: string, totpToken?: string) => {
    try {
      const data = await apiLogin(email, password, totpToken)
      setUser(data.user)
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('tenant_id', data.tenant_id)
      return {}
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { code?: string; error?: string } } }
      if (axiosErr.response?.data?.code === '2FA_REQUIRED') {
        return { requires2FA: true }
      }
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      setUser(null)
      localStorage.removeItem('user')
      localStorage.removeItem('tenant_id')
      localStorage.removeItem('csrf_token')
    }
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  }), [user, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
