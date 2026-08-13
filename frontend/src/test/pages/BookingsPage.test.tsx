import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import BookingsPage from '@/modules/bookings/pages/BookingsPage';

// --- Hoisted mock values (accessible inside vi.mock factories) ---

const mockHookReturn = vi.hoisted(() => ({
  data: undefined as { data: Record<string, unknown>[]; total: number; totalPages: number } | undefined,
  isLoading: true,
  isError: false,
  error: null as Error | null,
  refetch: vi.fn(),
}));

const mockUser = vi.hoisted(() => ({
  id: 1,
  email: 'admin@clinic.com',
  role: 'admin',
  name: 'Admin User',
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

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        management_title: 'Gestion de Citas',
        my_appointments: 'Mis Citas',
        loading_bookings: 'Cargando citas...',
        newAppointment: 'Nueva Cita',
        results_found: 'Resultados encontrados',
        list_view_tooltip: 'Vista de lista',
        calendar_view_tooltip: 'Vista de calendario',
        previous_page: 'Anterior',
        next_page: 'Siguiente',
        page_of: 'Pagina 1 de 1',
        no_appointments_title: 'Sin citas',
        no_appointments_empty: 'No hay citas programadas',
        no_appointments_filtered: 'Sin citas filtradas',
        schedule_appointment: 'Agendar cita',
        unknown_status: 'Desconocido',
        without_name: 'Sin nombre',
        view_detail_tooltip: 'Ver detalle',
        filterAll: 'Todas',
        filterPending: 'Pendientes',
        filterConfirmed: 'Confirmadas',
        filterCancelled: 'Canceladas',
        filterCompleted: 'Completadas',
        'statusLabels.no_show': 'No asistió',
        'statusLabels.pending': 'Pendiente',
        'statusLabels.confirmed': 'Confirmada',
        'statusLabels.cancelled': 'Cancelada',
        'statusLabels.completed': 'Completada',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual };
});

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: vi.fn(() => true),
  }),
}));

vi.mock('@/modules/bookings/hooks/useBookings', () => ({
  useAllBookings: () => mockHookReturn,
  useMyBookings: () => mockHookReturn,
  useDoctorBookings: () => mockHookReturn,
  useCancelBooking: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateBooking: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateBookingSeries: () => ({ mutate: vi.fn(), isPending: false }),
  useRescheduleBooking: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/modules/doctors/hooks/useDoctors', () => ({
  useDoctorList: () => ({
    data: { data: [] },
    isLoading: false,
  }),
  usePublicDoctorList: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock('@/modules/bookings/components/CreateBookingDialog', () => ({
  CreateBookingDialog: () => null,
}));

vi.mock('@/modules/bookings/components/BookingDetailDrawer', () => ({
  BookingDetailDrawer: () => null,
}));

vi.mock('@/modules/bookings/components/BookingCalendar', () => ({
  BookingCalendar: () => null,
}));

// --- Render helper ---

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <BookingsPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

// --- Tests ---

describe('BookingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookReturn.isLoading = true;
    mockHookReturn.data = undefined;
    mockHookReturn.isError = false;
    mockHookReturn.error = null;
    mockHookReturn.refetch = vi.fn();
  });

  it('shows loading state while data is being fetched', () => {
    mockHookReturn.isLoading = true;
    renderPage();
    expect(screen.getByText('Cargando citas...')).toBeInTheDocument();
  });

  it('renders the page title for admin role', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0, totalPages: 0 };
    renderPage();
    expect(screen.getByText('Gestion de Citas')).toBeInTheDocument();
  });

  it('renders booking cards when data is loaded', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = {
      data: [
        {
          id: 1,
          tenant_id: 1,
          patient_id: 10,
          doctor_id: 5,
          guest_name: null,
          guest_email: null,
          guest_phone: null,
          date: '2026-07-30',
          time: '10:00',
          duration: 30,
          status: 'confirmed',
          notes: 'Check-up general',
          doctor_name: 'Juan Perez',
          patient_name: 'Maria Garcia',
          created_at: '2026-07-25T10:00:00Z',
          updated_at: '2026-07-25T10:00:00Z',
        },
      ],
      total: 1,
      totalPages: 1,
    };
    renderPage();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    expect(screen.getByText(/Juan Perez/)).toBeInTheDocument();
  });

  it('displays the "Nueva Cita" button', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0, totalPages: 0 };
    renderPage();
    expect(screen.getByText('Nueva Cita')).toBeInTheDocument();
  });

  it('renders status filter chips', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0, totalPages: 0 };
    renderPage();
    expect(screen.getByText('Todas')).toBeInTheDocument();
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    expect(screen.getByText('Confirmadas')).toBeInTheDocument();
  });

  it('shows empty state when there are no bookings', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0, totalPages: 0 };
    renderPage();
    expect(screen.getByText('Sin citas')).toBeInTheDocument();
    expect(screen.getByText('No hay citas programadas')).toBeInTheDocument();
  });

  it('does not render booking cards while loading', () => {
    mockHookReturn.isLoading = true;
    renderPage();
    expect(screen.queryByText('Maria Garcia')).not.toBeInTheDocument();
    expect(screen.queryByText('Nueva Cita')).not.toBeInTheDocument();
  });
});
