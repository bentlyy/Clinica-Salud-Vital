import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { I18nProvider } from '@/i18n/I18nContext'
import { ThemeProvider } from '@/context/ThemeContext'
import LabDashboard from '@/pages/lab/LabDashboard'

/* ── Mocks ────────────────────────────────────────────────────────────────── */

const mockGetLabDashboard = vi.fn()
const mockGetLabRequests = vi.fn()
const mockGetLabAreas = vi.fn()

vi.mock('@/api/laboratory', () => ({
  getLabDashboard: (...args: unknown[]) => mockGetLabDashboard(...args),
  getLabRequests: (...args: unknown[]) => mockGetLabRequests(...args),
  getLabAreas: (...args: unknown[]) => mockGetLabAreas(...args),
}))

vi.mock('@/context/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: 'Tecnico Lab',
      email: 'lab@test.com',
      role: 'lab_technician',
      rut: '12345678-9',
      phone: '+56912345678',
      tenant_id: 'tenant-1',
    },
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

/* ── Test data ────────────────────────────────────────────────────────────── */

const mockDashboardStats = {
  pendingSamples: 8,
  inProcess: 3,
  completed: 15,
  alerts: 2,
}

const mockRequests = [
  {
    id: 1,
    patient_name: 'Maria Garcia',
    doctor_name: 'Dr. Juan Perez',
    status: 'pending',
    created_at: '2026-01-15T08:00:00',
    items_count: 3,
  },
  {
    id: 2,
    patient_name: 'Carlos Lopez',
    doctor_name: 'Dra. Ana Rodriguez',
    status: 'in_process',
    created_at: '2026-01-15T09:30:00',
    items_count: 2,
  },
  {
    id: 3,
    patient_name: 'Ana Torres',
    doctor_name: 'Dr. Juan Perez',
    status: 'completed',
    created_at: '2026-01-14T14:00:00',
    items_count: 4,
  },
]

const mockAreas = [
  { id: 1, name: 'Hematologia', pendingCount: 3, status: 'active' },
  { id: 2, name: 'Quimica', pendingCount: 1, status: 'active' },
  { id: 3, name: 'Microbiologia', pendingCount: 0, status: 'inactive' },
]

/* ── Helper ───────────────────────────────────────────────────────────────── */

function renderDashboard() {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider defaultLocale="es">
          <LabDashboard />
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>,
  )
}

/* ── Tests ────────────────────────────────────────────────────────────────── */

describe('LabDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetLabDashboard.mockResolvedValue(mockDashboardStats)
    mockGetLabRequests.mockResolvedValue(mockRequests)
    mockGetLabAreas.mockResolvedValue(mockAreas)
  })

  it('shows loading state', () => {
    // Make all APIs hang
    mockGetLabDashboard.mockReturnValue(new Promise(() => {}))
    mockGetLabRequests.mockReturnValue(new Promise(() => {}))
    mockGetLabAreas.mockReturnValue(new Promise(() => {}))

    renderDashboard()

    const skeletons = document.querySelectorAll('.ld-skeleton-card')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders kanban columns (Pendiente, En Proceso, Completado)', async () => {
    renderDashboard()

    // The kanban column headers contain these texts
    await waitFor(() => {
      expect(screen.getAllByText('Pendiente').length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getAllByText('En Proceso').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Completado').length).toBeGreaterThanOrEqual(1)
  })

  it('displays stat cards', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Pendientes')).toBeInTheDocument()
    })

    expect(screen.getByText('Alertas')).toBeInTheDocument()
    expect(screen.getByText('Completadas')).toBeInTheDocument()

    // Verify stat values
    expect(screen.getByText('8')).toBeInTheDocument() // pending samples
    expect(screen.getByText('15')).toBeInTheDocument() // completed
    expect(screen.getByText('2')).toBeInTheDocument() // alerts
  })

  it('handles empty kanban columns', async () => {
    mockGetLabDashboard.mockResolvedValue({
      pendingSamples: 0,
      inProcess: 0,
      completed: 0,
      alerts: 0,
    })
    mockGetLabRequests.mockResolvedValue([])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Sin muestras pendientes')).toBeInTheDocument()
    })

    expect(screen.getByText('Sin muestras en proceso')).toBeInTheDocument()
    expect(screen.getByText('Sin muestras completadas')).toBeInTheDocument()
  })

  it('shows lab areas', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Hematologia')).toBeInTheDocument()
    })

    expect(screen.getByText('Quimica')).toBeInTheDocument()
    expect(screen.getByText('Microbiologia')).toBeInTheDocument()
  })
})
