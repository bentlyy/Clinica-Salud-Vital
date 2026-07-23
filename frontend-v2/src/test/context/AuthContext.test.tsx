import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/context/useAuth'
import type { ReactNode } from 'react'

// Mock the API layer so we don't make real HTTP calls
vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(),
}))

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.removeItem('user')
    localStorage.removeItem('tenant_id')
  })

  it('starts with no user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('completes loading after mount', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    // The useEffect sets loading to false after mount
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('throws when used outside AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useAuth())).toThrow(
      /useAuth must be used within an AuthProvider/,
    )

    consoleError.mockRestore()
  })

  it('restores user from localStorage if available', () => {
    const mockUser = {
      id: 1,
      email: 'doctor@clinica.com',
      role: 'doctor',
      name: 'Dr. Test',
      rut: '12.345.678-9',
      phone: '+56912345678',
      tenant_id: 'tenant-001',
    }
    localStorage.setItem('user', JSON.stringify(mockUser))

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isAuthenticated).toBe(true)
  })
})
