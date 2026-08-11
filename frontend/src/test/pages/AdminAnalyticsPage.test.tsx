import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import AdminAnalyticsPage from '@/modules/analytics/pages/AdminAnalyticsPage';

const hooks = vi.hoisted(() => ({
  useAdminAnalytics: vi.fn(),
  useMyDoctorStats: vi.fn(),
  useBookingsByMonth: vi.fn(),
  useStatusDistribution: vi.fn(),
  useNoShows: vi.fn(),
  useDiagnoses: vi.fn(),
  useDemand: vi.fn(),
  useSchedules: vi.fn(),
  useVitals: vi.fn(),
}));

const auth = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock('@/modules/analytics/hooks/useAnalytics', () => hooks);
vi.mock('@/shared/providers/AuthProvider', () => auth);
vi.mock('@/i18n/i18n', () => ({ default: { language: 'es', on: vi.fn() } }));

vi.mock('react-i18next', () => {
  const adminAnalytics: Record<string, string> = {
    title: 'Análisis',
    subtitle: 'Métricas de la clínica',
    tabGeneral: 'General',
    tabNoShows: 'Inasistencias',
    tabDiagnoses: 'Diagnósticos',
    tabDemand: 'Demanda',
    tabSchedules: 'Horarios',
    tabVitals: 'Signos vitales',
    totalPatients: 'Pacientes',
    totalDoctors: 'Doctores',
    totalBookings: 'Reservas',
    todayBookings: 'Reservas hoy',
    topDoctors: 'Top Doctores',
    noData: 'Sin datos',
    colDoctor: 'Doctor',
    colSpecialty: 'Especialidad',
    colBookings: 'Reservas',
    colConfirmed: 'Confirmadas',
    myAnalytics: 'Mis Análisis',
    myAnalyticsSubtitle: 'Tu desempeño',
    myBookings: 'Mis reservas',
    patientsServed: 'Pacientes atendidos',
    upcomingBookings: 'Próximas',
    clinicalRecords: 'Fichas',
  };
  const common: Record<string, string> = {
    error_default_title: 'Algo salió mal',
    error_default_message: 'Inténtalo nuevamente',
    retry: 'Reintentar',
  };
  return {
    useTranslation: (ns?: string) => ({
      t: (key: string) => (ns === 'common' ? common : adminAnalytics)[key] ?? key,
      i18n: { language: 'es' },
    }),
  };
});

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
  };
});

vi.mock('@/modules/analytics/components/BookingsByMonthChart', () => ({
  BookingsByMonthChart: () => <div data-testid="bookings-chart" />,
}));
vi.mock('@/modules/analytics/components/StatusPieChart', () => ({
  StatusPieChart: () => <div data-testid="status-chart" />,
}));
vi.mock('@/modules/analytics/components/NoShowsPanel', () => ({
  NoShowsPanel: () => <div data-testid="noshow-panel" />,
}));
vi.mock('@/modules/analytics/components/DiagnosesPanel', () => ({
  DiagnosesPanel: () => <div data-testid="diagnoses-panel" />,
}));
vi.mock('@/modules/analytics/components/DemandPanel', () => ({
  DemandPanel: () => <div data-testid="demand-panel" />,
}));
vi.mock('@/modules/analytics/components/SchedulesPanel', () => ({
  SchedulesPanel: () => <div data-testid="schedules-panel" />,
}));
vi.mock('@/modules/analytics/components/VitalsPanel', () => ({
  VitalsPanel: () => <div data-testid="vitals-panel" />,
}));

const baseAnalytics = {
  stats: { total_patients: 100, total_doctors: 5, total_bookings: 40, today_bookings: 3, confirmed_bookings: 30, cancelled_bookings: 5 },
  bookings_by_month: [],
  bookings_by_status: [],
  top_doctors: [{ id: 1, name: 'Dra. Ana', specialty: 'Cardiología', appointments: 12, confirmed_bookings: 9, total_bookings: 12 }],
};

function mockQueries() {
  hooks.useAdminAnalytics.mockReturnValue({ data: baseAnalytics, isLoading: false, error: null, refetch: vi.fn() });
  hooks.useMyDoctorStats.mockReturnValue({
    data: { total_bookings: 8, upcoming_bookings: 2, patients_served: 20, clinical_records: 4 },
    error: null,
    refetch: vi.fn(),
  });
  hooks.useBookingsByMonth.mockReturnValue({ data: [], isLoading: false });
  hooks.useStatusDistribution.mockReturnValue({ data: [], isLoading: false });
  hooks.useNoShows.mockReturnValue({ data: [], isLoading: false });
  hooks.useDiagnoses.mockReturnValue({ data: [], isLoading: false });
  hooks.useDemand.mockReturnValue({ data: [], isLoading: false });
  hooks.useSchedules.mockReturnValue({ data: [], isLoading: false });
  hooks.useVitals.mockReturnValue({ data: [], isLoading: false });
}

function renderPage() {
  return render(
    <AppThemeProvider>
      <AdminAnalyticsPage />
    </AppThemeProvider>,
  );
}

describe('AdminAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueries();
  });

  it('renders the admin overview with stats, charts and the top doctors table', () => {
    auth.useAuth.mockReturnValue({ user: { role: 'admin' } });
    renderPage();
    expect(screen.getByText('Análisis')).toBeInTheDocument();
    expect(screen.getByText('Pacientes')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Doctores')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getAllByText('Reservas').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('Top Doctores')).toBeInTheDocument();
    expect(screen.getByText('Dra. Ana')).toBeInTheDocument();
    expect(screen.getByText('Cardiología')).toBeInTheDocument();
    expect(screen.getByTestId('bookings-chart')).toBeInTheDocument();
    expect(screen.getByTestId('status-chart')).toBeInTheDocument();
  });

  it('switches tabs and renders the corresponding panel', () => {
    auth.useAuth.mockReturnValue({ user: { role: 'admin' } });
    renderPage();
    fireEvent.click(screen.getByText('Inasistencias'));
    expect(screen.getByTestId('noshow-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Diagnósticos'));
    expect(screen.getByTestId('diagnoses-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Demanda'));
    expect(screen.getByTestId('demand-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Horarios'));
    expect(screen.getByTestId('schedules-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Signos vitales'));
    expect(screen.getByTestId('vitals-panel')).toBeInTheDocument();
  });

  it('shows the doctor analytics view for doctor users', () => {
    auth.useAuth.mockReturnValue({ user: { role: 'doctor' } });
    renderPage();
    expect(screen.getByText('Mis Análisis')).toBeInTheDocument();
    expect(screen.getByText('Mis reservas')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Pacientes atendidos')).toBeInTheDocument();
    expect(screen.getByTestId('bookings-chart')).toBeInTheDocument();
    expect(screen.getByTestId('status-chart')).toBeInTheDocument();
    expect(screen.queryByText('Top Doctores')).not.toBeInTheDocument();
  });

  it('renders the error state with retry when the analytics query fails', () => {
    auth.useAuth.mockReturnValue({ user: { role: 'admin' } });
    hooks.useAdminAnalytics.mockReturnValue({ data: undefined, isLoading: false, error: new Error('boom'), refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
