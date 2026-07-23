import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { I18nProvider } from '@/i18n/I18nContext'
import { ThemeProvider } from '@/context/ThemeContext'
import AdminDashboard from '@/pages/admin/AdminDashboard'

/* ── Mocks ────────────────────────────────────────────────────────────────── */

const mockGetDashboardStats = vi.fn()
const mockGetStatusDistribution = vi.fn()
const mockGetAllBookings = vi.fn()
const mockGetDoctors = vi.fn()

vi.mock('@/api/analytics', () => ({
  getDashboardStats: (...args: unknown[]) => mockGetDashboardStats(...args),
  getStatusDistribution: (...args: unknown[]) => mockGetStatusDistribution(...args),
}))

vi.mock('@/api/bookings', () => ({
  getAllBookings: (...args: unknown[]) => mockGetAllBookings(...args),
}))

vi.mock('@/api/doctors', () => ({
  getDoctors: (...args: unknown[]) => mockGetDoctors(...args),
}))

/* ── Test data ────────────────────────────────────────────────────────────── */

const mockStats = {
  totalDoctors: 12,
  totalPatients: 248,
  todayBookings: 18,
  monthRevenue: 45600,
}

const mockBookings = [
  {
    id: '1',
    patientName: 'Maria Garcia',
    doctorName: 'Dr. Juan Perez',
    date: '2026-01-15',
    time: '09:00',
    status: 'confirmed' as const,
  },
  {
    id: '2',
    patientName: 'Carlos Lopez',
    doctorName: 'Dra. Ana Rodriguez',
    date: '2026-01-15',
    time: '10:30',
    status: 'pending' as const,
  },
]

const mockDoctors = [
  { id: '1', name: 'Dr. Juan Perez', specialty: 'Cardiologia' },
  { id: '2', name: 'Dra. Ana Rodriguez', specialty: 'Dermatologia' },
]

const mockStatusDistribution = [
  { status: 'pending', count: 5 },
  { status: 'confirmed', count: 8 },
  { status: 'completed', count: 12 },
  { status: 'cancelled', count: 2 },
]

/* ── Helper: render within providers ──────────────────────────────────────── */

function renderDashboard() {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider defaultLocale="es">
          <AdminDashboard />
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>,
  )
}

/* ── Tests ────────────────────────────────────────────────────────────────── */

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: all APIs succeed
    mockGetDashboardStats.mockResolvedValue(mockStats)
    mockGetStatusDistribution.mockResolvedValue(mockStatusDistribution)
    mockGetAllBookings.mockResolvedValue(mockBookings)
    mockGetDoctors.mockResolvedValue(mockDoctors)
  })

  it('shows loading skeletons initially', () => {
    // Make all APIs hang so loading stays visible
    mockGetDashboardStats.mockReturnValue(new Promise(() => {}))
    mockGetAllBookings.mockReturnValue(new Promise(() => {}))
    mockGetDoctors.mockReturnValue(new Promise(() => {}))
    mockGetStatusDistribution.mockReturnValue(new Promise(() => {}))

    renderDashboard()

    const skeletonCards = document.querySelectorAll('.skeleton-card')
    expect(skeletonCards.length).toBeGreaterThan(0)
  })

  it('renders stat cards with data after load', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Doctores')).toBeInTheDocument()
    })

    // totalDoctors = 12, but "12" also appears in status distribution (completed=12)
    const twelveElements = screen.getAllByText('12')
    expect(twelveElements.length).toBeGreaterThanOrEqual(1)

    expect(screen.getByText('248')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getByText(/45/)).toBeInTheDocument() // revenue formatted
  })

  it('renders recent bookings table', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Maria Garcia')).toBeInTheDocument()
    })

    // "Dr. Juan Perez" appears in both bookings table and top doctors sidebar
    const drPerezElements = screen.getAllByText('Dr. Juan Perez')
    expect(drPerezElements.length).toBeGreaterThanOrEqual(1)

    expect(screen.getByText('Carlos Lopez')).toBeInTheDocument()
    // "Dra. Ana Rodriguez" appears in both bookings table and top doctors sidebar
    const anaElements = screen.getAllByText('Dra. Ana Rodriguez')
    expect(anaElements.length).toBeGreaterThanOrEqual(1)
  })

  it('shows error state when all APIs fail', async () => {
    mockGetDashboardStats.mockRejectedValue(new Error('Stats API down'))
    mockGetAllBookings.mockRejectedValue(new Error('Bookings API down'))
    mockGetDoctors.mockRejectedValue(new Error('Doctors API down'))
    mockGetStatusDistribution.mockRejectedValue(new Error('Status API down'))

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar el dashboard/)).toBeInTheDocument()
    })
  })

  it('shows partial data when some APIs fail', async () => {
    // Stats succeed, bookings fail, doctors succeed, status fails
    mockGetDashboardStats.mockResolvedValue(mockStats)
    mockGetAllBookings.mockRejectedValue(new Error('Bookings down'))
    mockGetDoctors.mockResolvedValue(mockDoctors)
    mockGetStatusDistribution.mockRejectedValue(new Error('Status down'))

    renderDashboard()

    // Should still show the stat labels from the successful API
    await waitFor(() => {
      expect(screen.getByText('Doctores')).toBeInTheDocument()
    })

    // Should not show an error state since not all failed
    expect(screen.queryByText(/Error al cargar el dashboard/)).not.toBeInTheDocument()
  })

  it('displays doctor count, patient count, today bookings, revenue', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Doctores')).toBeInTheDocument()
    })

    expect(screen.getByText('Citas Hoy')).toBeInTheDocument()
    expect(screen.getByText('Pacientes')).toBeInTheDocument()
    expect(screen.getByText('Ingresos del Mes')).toBeInTheDocument()
  })
})
