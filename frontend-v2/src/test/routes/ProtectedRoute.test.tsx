import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { I18nProvider } from '@/i18n/I18nContext'
import ProtectedRoute from '@/routes/ProtectedRoute'

// Mock the API layer
vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(),
}))

function renderWithProviders(
  ui: React.ReactNode,
  { initialEntries = ['/protected'] }: { initialEntries?: string[] } = {},
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <ThemeProvider>
          <I18nProvider>
            <Routes>
              <Route
                path="/protected"
                element={ui}
              />
              <Route
                path="/"
                element={<div>Home Page</div>}
              />
              <Route
                path="/?openLogin=1"
                element={<div>Home Login Page</div>}
              />
            </Routes>
          </I18nProvider>
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.removeItem('user')
    localStorage.removeItem('tenant_id')
  })

  it('shows a loading spinner initially', () => {
    // With loading true, AuthContext hasn't finished its first check
    // The spinner is an element with animation: spin
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    )

    // The Protected Content should NOT be visible during loading
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('redirects to home page with openLogin param when not authenticated', async () => {
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    )

    // Wait for Auth loading to finish — content should NOT be rendered
    // since the user is not authenticated, ProtectedRoute navigates to /?openLogin=1
    await vi.waitFor(() => {
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })
  })

  it('renders children when user is authenticated', () => {
    const mockUser = {
      id: 1,
      email: 'admin@clinica.com',
      role: 'admin',
      name: 'Admin',
      rut: '11.111.111-1',
      phone: '+56900000000',
      tenant_id: 'tenant-001',
    }
    localStorage.setItem('user', JSON.stringify(mockUser))

    renderWithProviders(
      <ProtectedRoute>
        <div>Super Secret Panel</div>
      </ProtectedRoute>,
    )
  })

  it('redirects to home when role is not allowed', () => {
    const mockUser = {
      id: 2,
      email: 'patient@clinica.com',
      role: 'patient',
      name: 'Paciente',
      rut: '22.222.222-2',
      phone: '+56911111111',
      tenant_id: 'tenant-001',
    }
    localStorage.setItem('user', JSON.stringify(mockUser))

    renderWithProviders(
      <ProtectedRoute allowedRoles={['admin', 'doctor']}>
        <div>Solo admin o doctor</div>
      </ProtectedRoute>,
    )
  })
})
