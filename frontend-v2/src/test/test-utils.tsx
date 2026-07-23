import { render, type RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from '@/i18n/I18nContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  userRole?: string
  route?: string
}

/* ── Default mock user ────────────────────────────────────────────────────── */

export const createMockUser = (role: string = 'admin') => ({
  id: 1,
  name: 'Test User',
  email: 'test@test.com',
  role,
  rut: '12345678-9',
  phone: '+56912345678',
  tenant_id: 'tenant-1',
})

/* ── Provider Wrapper ─────────────────────────────────────────────────────── */

function AllProviders({ children, userRole }: { children: ReactNode; userRole?: string }) {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider defaultLocale="es">
          {children}
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

/* ── Custom render ────────────────────────────────────────────────────────── */

export function renderWithProviders(
  ui: ReactElement,
  { userRole = 'admin', route, ...renderOptions }: CustomRenderOptions = {},
) {
  // Set the initial route if provided
  if (route) {
    window.history.pushState({}, '', route)
  }

  const mockUser = createMockUser(userRole)

  // Mock useAuth at the module level so components that import it get the mock
  vi.doMock('@/context/useAuth', () => ({
    useAuth: () => ({
      user: mockUser,
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    }),
  }))

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AllProviders userRole={userRole}>{children}</AllProviders>
  )

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    mockUser,
  }
}

export { vi }
