import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import DashboardPage from '@/modules/dashboard/pages/DashboardPage';

const authMock = vi.hoisted(() => ({
  user: { id: 1, email: 'admin@clinic.com', role: 'admin', name: 'Admin', tenant_id: 1 },
  isAuthenticated: true,
  isLoading: false,
  hasPermission: vi.fn(() => true),
  login: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
}));

const statsMock = vi.hoisted(() => ({ data: undefined as unknown, isLoading: false }));
const upcomingMock = vi.hoisted(() => ({ data: undefined as unknown, isLoading: false }));
const myBookingsMock = vi.hoisted(() => ({ data: undefined as unknown, isLoading: false }));

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
  useTranslation: () => {
    const translations: Record<string, string> = {
      loading: 'Cargando...',
      welcome_doctor: 'Bienvenido, Dr. {{name}}',
      welcome_user: 'Bienvenido, {{name}}',
      default_user: 'Usuario',
      role_subtitle: '{{role}}',
      upcomingAppointments: 'Citas Próximas',
      patientsAttended: 'Pacientes Atendidos',
      totalAppointments: 'Total Citas',
      clinicalRecords: 'Expedientes',
      todaysAppointments: 'Citas Hoy',
      totalPatients: 'Pacientes',
      confirmed: 'Confirmadas',
      cancelled: 'Canceladas',
      completed: 'Completadas',
      tabDashboard: 'Dashboard',
      tabUsers: 'Usuarios',
      tabDoctors: 'Doctores',
      tabPatients: 'Pacientes',
      tabSpecialties: 'Especialidades',
      upcoming_appointments_section: 'Próximas Citas',
      'status.pending': 'Pendiente',
      'status.confirmed': 'Confirmado',
      no_name: 'Sin nombre',
      no_upcoming_appointments: 'No hay citas próximas',
      doctor: 'Médico',
    };
    return {
      t: (key: string, opts?: Record<string, unknown>) => {
        const value = translations[key] ?? key;
        if (opts) return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts[name]));
        return value;
      },
      i18n: { language: 'es' },
    };
  },
}));

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => authMock,
}));

vi.mock('@/modules/dashboard/hooks/useAnalytics', () => ({
  useDashboardStats: () => statsMock,
  useUpcomingBookings: () => upcomingMock,
  useMyDoctorStats: () => statsMock,
  useDoctorUpcomingBookings: () => upcomingMock,
}));

vi.mock('@/modules/bookings/hooks/useBookings', () => ({
  useMyBookings: () => myBookingsMock,
}));

function renderPage() {
  return render(
    <AppThemeProvider>
      <DashboardPage />
    </AppThemeProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.user = { id: 1, email: 'admin@clinic.com', role: 'admin', name: 'Admin', tenant_id: 1 };
    statsMock.data = undefined;
    statsMock.isLoading = false;
    upcomingMock.data = undefined;
    upcomingMock.isLoading = false;
    myBookingsMock.data = undefined;
    myBookingsMock.isLoading = false;
  });

  it('renders the doctor dashboard with stats and upcoming appointments', () => {
    authMock.user = { id: 2, email: 'dr@clinic.com', role: 'doctor', name: 'Perez', tenant_id: 1 };
    statsMock.data = { upcoming_bookings: 3, patients_served: 15, total_bookings: 20, clinical_records: 5 };
    upcomingMock.data = [
      { id: 1, patient_name: 'Maria Garcia', date: '2026-08-15', time: '10:00', status: 'confirmed' },
    ];
    renderPage();

    expect(screen.getByText('Bienvenido, Dr. Perez')).toBeInTheDocument();
    expect(screen.getByText('Citas Próximas')).toBeInTheDocument();
    expect(screen.getByText('Pacientes Atendidos')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
  });

  it('renders the patient dashboard with booking stats', () => {
    authMock.user = { id: 3, email: 'user@clinic.com', role: 'patient', name: 'Lucia', tenant_id: 1 };
    myBookingsMock.data = {
      data: [
        { id: 1, doctor_name: 'Dr. Perez', date: '2026-08-15', time: '10:00', status: 'confirmed' },
        { id: 2, doctor_name: 'Dr. Perez', date: '2026-07-01', time: '09:00', status: 'completed' },
        { id: 3, doctor_name: 'Dr. Perez', date: '2026-07-02', time: '11:00', status: 'cancelled' },
      ],
    };
    renderPage();

    expect(screen.getByText('Bienvenido, Lucia')).toBeInTheDocument();
    expect(screen.getByText('Completadas')).toBeInTheDocument();
    expect(screen.getByText('Canceladas')).toBeInTheDocument();
    expect(screen.getByText('Dr. Perez')).toBeInTheDocument();
  });

  it('shows the empty state when the patient has no upcoming bookings', () => {
    authMock.user = { id: 3, email: 'user@clinic.com', role: 'user', name: 'Lucia', tenant_id: 1 };
    myBookingsMock.data = { data: [] };
    renderPage();
    expect(screen.getByText('No hay citas próximas')).toBeInTheDocument();
  });

  it('renders the admin dashboard with tabs and today stats', () => {
    statsMock.data = { today_bookings: 4, total_patients: 120, total_bookings: 300, confirmed_bookings: 90 };
    upcomingMock.data = [
      { id: 1, patient_name: 'Maria Garcia', date: '2026-08-15', time: '10:00', status: 'pending', doctor_name: 'Dr. Perez' },
    ];
    renderPage();

    expect(screen.getByText('Bienvenido, Admin')).toBeInTheDocument();
    expect(screen.getByText('Citas Hoy')).toBeInTheDocument();
    expect(screen.getByText('Confirmadas')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Usuarios' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Doctores' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pacientes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Especialidades' })).toBeInTheDocument();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
  });
});
