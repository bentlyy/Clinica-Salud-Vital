import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { I18nProvider } from '@/i18n/I18nContext'
import { ThemeProvider } from '@/context/ThemeContext'
import SuperAdminDashboard from '@/pages/superadmin/SuperAdminDashboard'

/* ── Mocks ────────────────────────────────────────────────────────────────── */

const mockGetSuperAdminStats = vi.fn()
const mockGetTenants = vi.fn()

vi.mock('@/api/super-admin', () => ({
  getSuperAdminStats: (...args: unknown[]) => mockGetSuperAdminStats(...args),
  getTenants: (...args: unknown[]) => mockGetTenants(...args),
}))

/* ── Test data ────────────────────────────────────────────────────────────── */

const mockStats = {
  totalTenants: 8,
  mrr: 12500.5,
  totalUsers: 342,
  uptime: 99.7,
}

const mockTenants = [
  {
    id: 't1',
    name: 'Clinica Central',
    domain: 'central.clinica.com',
    active: true,
    created_at: '2025-01-01T00:00:00',
    config: {},
    users_count: 45,
    plan: 'Enterprise',
  },
  {
    id: 't2',
    name: 'San Rafael',
    domain: 'rafael.clinica.com',
    active: true,
    created_at: '2025-03-15T00:00:00',
    config: {},
    users_count: 22,
    plan: 'Profesional',
  },
]

/* ── Helper ───────────────────────────────────────────────────────────────── */

function renderDashboard() {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider defaultLocale="es">
          <SuperAdminDashboard />
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>,
  )
}

/* ── Tests ────────────────────────────────────────────────────────────────── */

describe('SuperAdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetSuperAdminStats.mockResolvedValue(mockStats)
    mockGetTenants.mockResolvedValue(mockTenants)
  })

  it('shows loading state', () => {
    // Make all APIs hang
    mockGetSuperAdminStats.mockReturnValue(new Promise(() => {}))
    mockGetTenants.mockReturnValue(new Promise(() => {}))

    renderDashboard()

    const skeletons = document.querySelectorAll('.sa-skeleton-card')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders stats (tenants, MRR, users, uptime)', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('8')).toBeInTheDocument()
    })

    expect(screen.getByText('342')).toBeInTheDocument()
    expect(screen.getByText('99.7%')).toBeInTheDocument()
    expect(screen.getByText('MRR')).toBeInTheDocument()
    // "Tenants" appears both in stat label and panel title
    expect(screen.getAllByText('Tenants').length).toBeGreaterThanOrEqual(1)
    // "Usuarios" appears in both stat label and table header
    expect(screen.getAllByText('Usuarios').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Uptime')).toBeInTheDocument()
  })

  it('displays tenants table', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Clinica Central')).toBeInTheDocument()
    })

    expect(screen.getByText('San Rafael')).toBeInTheDocument()
    expect(screen.getByText('central.clinica.com')).toBeInTheDocument()
    expect(screen.getByText('rafael.clinica.com')).toBeInTheDocument()
    expect(screen.getByText('Enterprise')).toBeInTheDocument()
    expect(screen.getByText('Profesional')).toBeInTheDocument()
  })

  it('handles empty tenants list', async () => {
    mockGetTenants.mockResolvedValue([])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText(/No hay tenants registrados/)).toBeInTheDocument()
    })
  })

  it('shows the revenue sidebar', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Ingresos Recurrentes')).toBeInTheDocument()
    })

    expect(screen.getByText('Salud del Sistema')).toBeInTheDocument()
  })
})
