import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { I18nProvider } from '@/i18n/I18nContext'
import { ThemeProvider } from '@/context/ThemeContext'
import PatientDashboard from '@/pages/patient/PatientDashboard'

/* ── Mocks ────────────────────────────────────────────────────────────────── */

const mockGetMyBookings = vi.fn()
const mockGetClinicalRecords = vi.fn()
const mockGetMyStats = vi.fn()

vi.mock('@/api/bookings', () => ({
  getMyBookings: (...args: unknown[]) => mockGetMyBookings(...args),
}))

vi.mock('@/api/clinical-records', () => ({
  getClinicalRecords: (...args: unknown[]) => mockGetClinicalRecords(...args),
}))

vi.mock('@/api/analytics', () => ({
  getMyStats: (...args: unknown[]) => mockGetMyStats(...args),
}))

/* ── Test data ────────────────────────────────────────────────────────────── */

const mockStats = {
  nextBooking: '2026-01-20T10:00:00',
  totalRecords: 5,
  labResults: 3,
  pendingInvoices: 1,
}

const mockBookings = [
  {
    id: '10',
    doctorName: 'Dr. Juan Perez',
    specialty: 'Cardiologia',
    date: '2026-01-20',
    time: '10:00',
    status: 'confirmed',
  },
  {
    id: '11',
    doctorName: 'Dra. Ana Rodriguez',
    specialty: 'Dermatologia',
    date: '2026-01-25',
    time: '15:30',
    status: 'pending',
  },
]

const mockRecords = [
  {
    id: '100',
    date: '2026-01-10',
    doctor: 'Juan Perez',
    diagnosis: 'Hipertension arterial',
    status: 'completed',
  },
  {
    id: '101',
    date: '2026-01-05',
    doctor: 'Ana Rodriguez',
    diagnosis: 'Control general',
    status: 'completed',
  },
]

/* ── Helper ───────────────────────────────────────────────────────────────── */

function renderDashboard() {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider defaultLocale="es">
          <PatientDashboard />
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>,
  )
}

/* ── Tests ────────────────────────────────────────────────────────────────── */

describe('PatientDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetMyStats.mockResolvedValue(mockStats)
    mockGetMyBookings.mockResolvedValue(mockBookings)
    mockGetClinicalRecords.mockResolvedValue(mockRecords)
  })

  it('shows loading state', () => {
    // Make all APIs hang
    mockGetMyStats.mockReturnValue(new Promise(() => {}))
    mockGetMyBookings.mockReturnValue(new Promise(() => {}))
    mockGetClinicalRecords.mockReturnValue(new Promise(() => {}))

    renderDashboard()

    const skeletons = document.querySelectorAll('.pd-skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders welcome message', async () => {
    renderDashboard()

    // t() returns the key when translations aren't defined for dashboard pages
    // The key text is part of a larger paragraph ("key, <strong>name</strong>")
    await waitFor(() => {
      expect(
        screen.getByText(/patientDashboard\.welcome/),
      ).toBeInTheDocument()
    })
  })

  it('displays next appointment highlight', async () => {
    renderDashboard()

    await waitFor(() => {
      // The featured section shows doctor name — may appear in records too
      const drPerez = screen.getAllByText('Dr. Juan Perez')
      expect(drPerez.length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getByText('Cardiologia')).toBeInTheDocument()
    // The badge text has accent: "● Próxima cita"
    expect(screen.getByText(/Pr[oó]xima cita/)).toBeInTheDocument()
  })

  it('shows medical records list', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Hipertension arterial')).toBeInTheDocument()
    })

    expect(screen.getByText('Control general')).toBeInTheDocument()
  })

  it('handles no upcoming appointment', async () => {
    mockGetMyBookings.mockResolvedValue([])
    mockGetMyStats.mockResolvedValue({
      ...mockStats,
      nextBooking: null,
    })

    renderDashboard()

    await waitFor(() => {
      // t() returns the key since dashboard translations aren't defined
      expect(
        screen.getByText('patientDashboard.noAppointments'),
      ).toBeInTheDocument()
    })
  })

  it('renders quick action buttons', async () => {
    renderDashboard()

    await waitFor(() => {
      // t() returns the key since dashboard translations aren't defined
      expect(
        screen.getByText('patientDashboard.bookCta'),
      ).toBeInTheDocument()
    })

    expect(
      screen.getByText('patientDashboard.viewRecordsCta'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('patientDashboard.viewResultsCta'),
    ).toBeInTheDocument()
  })
})
