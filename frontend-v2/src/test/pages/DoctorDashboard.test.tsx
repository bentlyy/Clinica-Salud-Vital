import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { I18nProvider } from '@/i18n/I18nContext'
import { ThemeProvider } from '@/context/ThemeContext'
import DoctorDashboard from '@/pages/doctor/DoctorDashboard'

/* ── Mocks ────────────────────────────────────────────────────────────────── */

const mockGetMyStats = vi.fn()
const mockGetDoctorBookings = vi.fn()
const mockGetDoctorProfile = vi.fn()

vi.mock('@/api/analytics', () => ({
  getMyStats: (...args: unknown[]) => mockGetMyStats(...args),
}))

vi.mock('@/api/bookings', () => ({
  getDoctorBookings: (...args: unknown[]) => mockGetDoctorBookings(...args),
}))

vi.mock('@/api/doctors', () => ({
  getDoctorProfile: (...args: unknown[]) => mockGetDoctorProfile(...args),
}))

vi.mock('@/context/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: 'Dr. Test User',
      email: 'doctor@test.com',
      role: 'doctor',
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

const mockStats = {
  todayBookings: 6,
  patientsAttended: 4,
  nextBooking: '2026-01-15T14:30:00',
  rating: 4.8,
}

const mockBookings = [
  {
    id: '1',
    time: '2026-01-15T09:00:00',
    duration: 30,
    patientName: 'Maria Garcia',
    type: 'Control',
    status: 'confirmed' as const,
  },
  {
    id: '2',
    time: '2026-01-15T10:00:00',
    duration: 45,
    patientName: 'Carlos Lopez',
    type: 'Primera vez',
    status: 'pending' as const,
  },
  {
    id: '3',
    time: '2026-01-15T11:00:00',
    duration: 30,
    patientName: 'Ana Torres',
    type: 'Urgencia',
    status: 'completed' as const,
  },
]

const mockProfile = {
  name: 'Dr. Juan Perez',
  specialty: 'Cardiologia',
  email: 'juan@test.com',
}

/* ── Helper ───────────────────────────────────────────────────────────────── */

function renderDashboard() {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider defaultLocale="es">
          <DoctorDashboard />
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>,
  )
}

/* ── Tests ────────────────────────────────────────────────────────────────── */

describe('DoctorDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetMyStats.mockResolvedValue(mockStats)
    mockGetDoctorBookings.mockResolvedValue(mockBookings)
    mockGetDoctorProfile.mockResolvedValue(mockProfile)
  })

  it('shows loading state', () => {
    // Make all APIs hang
    mockGetMyStats.mockReturnValue(new Promise(() => {}))
    mockGetDoctorBookings.mockReturnValue(new Promise(() => {}))
    mockGetDoctorProfile.mockReturnValue(new Promise(() => {}))

    renderDashboard()

    const skeletons = document.querySelectorAll('.dd-skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders welcome message with doctor name', async () => {
    renderDashboard()

    // The doctor profile name appears in the welcome subtitle
    await waitFor(() => {
      expect(screen.getByText(/Dr\. Juan Perez/)).toBeInTheDocument()
    })
  })

  it('displays today\'s patients list', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Maria Garcia')).toBeInTheDocument()
    })

    expect(screen.getByText('Carlos Lopez')).toBeInTheDocument()
    expect(screen.getByText('Ana Torres')).toBeInTheDocument()
  })

  it('shows stat cards (appointments, attended, next, rating)', async () => {
    renderDashboard()

    await waitFor(() => {
      // todayBookings = 6, also the calendar may render day numbers
      const sixElements = screen.getAllByText('6')
      expect(sixElements.length).toBeGreaterThanOrEqual(1)
    })

    // t() returns the key itself since dashboard translations aren't defined
    expect(screen.getByText('doctorDashboard.stats.todayBookings')).toBeInTheDocument()
    expect(screen.getByText('doctorDashboard.stats.attended')).toBeInTheDocument()
    expect(screen.getByText('4.8 / 5')).toBeInTheDocument()
  })

  it('handles empty patient list', async () => {
    mockGetDoctorBookings.mockResolvedValue([])

    renderDashboard()

    await waitFor(() => {
      // t() returns the key when translations aren't defined
      expect(screen.getByText('doctorDashboard.patients.empty.title')).toBeInTheDocument()
      expect(screen.getByText('doctorDashboard.patients.empty.text')).toBeInTheDocument()
    })
  })
})
