import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import DoctorPanel from '@/modules/doctors/pages/DoctorPanel';
import type { Booking } from '@/modules/bookings/types/booking.types';

// --- Hoisted mocks ---

const mockNavigate = vi.hoisted(() => vi.fn());

const myBookingsMock = vi.hoisted(() => ({
  data: undefined as { data: Booking[] } | undefined,
  isLoading: true,
  error: null as Error | null,
  refetch: vi.fn(),
}));

const mockUser = vi.hoisted(() => ({
  id: 1,
  email: 'dr@clinic.com',
  role: 'doctor',
  name: 'Dr. Juan Perez',
  tenant_id: 1,
}));

// --- Mocks ---

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'doctor_panel:loading': 'Cargando panel...',
        'doctor_panel:welcome': 'Hola, {{name}}',
        'doctor_panel:linkCalendar': 'Calendario',
        'doctor_panel:linkSchedule': 'Disponibilidad',
        'doctor_panel:linkHistory': 'Historial',
        'doctor_panel:linkLaboratory': 'Laboratorio',
        'doctor_panel:linkPatients': 'Pacientes',
        'doctor_panel:daySummary': 'Resumen del día',
        'doctor_panel:todayAppointments': 'Citas de hoy',
        'doctor_panel:upcomingAppointments': 'Próximas citas',
        'doctor_panel:activePatients': 'Pacientes activos',
        'doctor_panel:todayAgenda': 'Agenda de hoy',
        'doctor_panel:noAppointmentsToday': 'Sin citas para hoy',
        'doctor_panel:noAppointmentsTodayDesc': 'No tienes citas programadas para hoy.',
        'doctor_panel:viewAll': 'Ver todas',
        'doctor_panel:patient': 'Paciente',
        'doctor_panel:status.pending': 'Pendiente',
        'doctor_panel:status.confirmed': 'Confirmada',
        'doctor_panel:status.completed': 'Completada',
        'doctor_panel:status.cancelled': 'Cancelada',
        'doctor_panel:status.no_show': 'No asistió',
        retry: 'Reintentar',
        error_default_title: 'Error',
        error_default_message: 'Ocurrió un error',
      };
      const value = translations[key] ?? key;
      if (opts && value.includes('{{')) {
        return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts[name] ?? ''));
      }
      return value;
    },
    i18n: { language: 'es' },
  }),
}));

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/modules/bookings/hooks/useBookings', () => ({
  useMyBookings: () => myBookingsMock,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <DoctorPanel />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

const today = new Date().toISOString().split('T')[0]!;

function makeBooking(overrides: Partial<Booking>): Booking {
  return {
    id: 1,
    tenant_id: 1,
    patient_id: 10,
    doctor_id: 5,
    guest_name: null,
    guest_email: null,
    guest_phone: null,
    date: today,
    time: '10:00',
    duration: 30,
    status: 'confirmed',
    notes: null,
    doctor_name: 'Dr. Juan Perez',
    patient_name: 'Maria Garcia',
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    ...overrides,
  };
}

describe('DoctorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    myBookingsMock.data = undefined;
    myBookingsMock.isLoading = true;
    myBookingsMock.error = null;
    myBookingsMock.refetch = vi.fn();
  });

  it('shows the loading state while bookings are being fetched', () => {
    renderPage();
    expect(screen.getByText('Cargando panel...')).toBeInTheDocument();
  });

  it('shows an error state with retry when the fetch fails', () => {
    myBookingsMock.isLoading = false;
    myBookingsMock.error = new Error('Network error');
    renderPage();
    const retryButton = screen.getByRole('button', { name: 'Reintentar' });
    fireEvent.click(retryButton);
    expect(myBookingsMock.refetch).toHaveBeenCalled();
  });

  it('renders the doctor name and quick links', () => {
    myBookingsMock.isLoading = false;
    myBookingsMock.data = { data: [] };
    renderPage();
    expect(screen.getByText('Hola, Dr. Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Calendario')).toBeInTheDocument();
    expect(screen.getByText('Laboratorio')).toBeInTheDocument();
    expect(screen.getByText('Pacientes')).toBeInTheDocument();
  });

  it('shows the empty state when there are no bookings today', () => {
    myBookingsMock.isLoading = false;
    myBookingsMock.data = { data: [makeBooking({ date: '2099-01-01' })] };
    renderPage();
    expect(screen.getByText('Sin citas para hoy')).toBeInTheDocument();
  });

  it('lists today\'s bookings in the agenda', () => {
    myBookingsMock.isLoading = false;
    myBookingsMock.data = { data: [makeBooking({})] };
    renderPage();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    expect(screen.getByText('Confirmada')).toBeInTheDocument();
  });

  it('shows the patients counter based on unique patient ids', () => {
    myBookingsMock.isLoading = false;
    myBookingsMock.data = {
      data: [
        makeBooking({ id: 1, patient_id: 10 }),
        makeBooking({ id: 2, patient_id: 10, time: '11:00' }),
        makeBooking({ id: 3, patient_id: 20, time: '12:00' }),
      ],
    };
    renderPage();
    // 2 unique patients across all bookings
    const chips = screen.getAllByText('2');
    expect(chips.length).toBeGreaterThan(0);
  });

  it('navigates to the calendar quick link', () => {
    myBookingsMock.isLoading = false;
    myBookingsMock.data = { data: [] };
    renderPage();
    fireEvent.click(screen.getByText('Calendario'));
    expect(mockNavigate).toHaveBeenCalledWith('/calendar');
  });
});
