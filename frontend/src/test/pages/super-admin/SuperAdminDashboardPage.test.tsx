import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import SuperAdminDashboardPage from '@/modules/super-admin/pages/SuperAdminDashboardPage';
import type { SaasDashboard, HealthScore } from '@/modules/super-admin/types/super-admin.types';

const mockUseSuperAdminDashboard = vi.hoisted(() => vi.fn());
const mockUseHealthScores = vi.hoisted(() => vi.fn());
const mockUseAlerts = vi.hoisted(() => vi.fn());
const mockRefetch = vi.hoisted(() => vi.fn());

vi.mock('@/modules/super-admin/hooks/useSuperAdmin', () => ({
  useSuperAdminDashboard: mockUseSuperAdminDashboard,
  useHealthScores: mockUseHealthScores,
  useAlerts: mockUseAlerts,
}));

vi.mock('@/i18n/i18n', () => ({ default: { language: 'es', on: vi.fn() } }));

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    loading: 'Cargando indicadores...',
    title: 'Panel de Control',
    subtitle: 'Vista general de la plataforma',
    total_clinics: 'Clínicas totales',
    active_clinics: 'Clínicas activas',
    total_users: 'Usuarios totales',
    total_revenue: 'Ingresos totales',
    clinics_by_plan: 'Clínicas por plan',
    monthly_growth: 'Crecimiento mensual',
    health_score_title: 'Salud de las clínicas',
    health_empty: 'Sin datos de salud',
    alerts_title: 'Alertas',
    alerts_empty: 'Sin alertas activas',
    clinics_label: 'Clínicas',
    revenue_label: 'Ingresos',
    last_month: 'Último mes: {{month}} con {{count}} clínicas',
    retry: 'Reintentar',
  };
  const interpolate = (str: string, opts?: Record<string, unknown>) =>
    opts ? str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? '')) : str;
  // Stable `t` identity (defined once per module).
  const t = (key: string, opts?: Record<string, unknown> | string) => {
    const mapped = translations[key];
    if (mapped) return interpolate(mapped, opts as Record<string, unknown> | undefined);
    if (typeof opts === 'string') return opts;
    return key;
  };
  return {
    useTranslation: () => ({ t, i18n: { language: 'es' } }),
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

const dashboard: SaasDashboard = {
  total_tenants: 12,
  active_tenants: 9,
  total_users: 340,
  total_revenue: 500,
  tenants_by_plan: [
    { plan: 'free', count: 5 },
    { plan: 'pro', count: 4 },
  ],
  growth_by_month: [
    { month: '2026-01', tenants: 2, revenue: 100 },
    { month: '2026-02', tenants: 4, revenue: 200 },
  ],
};

const healthTenant: HealthScore = {
  id: 't1',
  name: 'Clínica Uno',
  active: true,
  health_score: 30,
  score_activity: 20,
  score_trend: 40,
  score_patients: 50,
  score_cancellation: 60,
  score_modules: 70,
  last_booking: null,
  bookings_30d: 5,
  bookings_prev_30d: 8,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <SuperAdminDashboardPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('SuperAdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSuperAdminDashboard.mockReturnValue({
      data: dashboard,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockUseHealthScores.mockReturnValue({ data: [healthTenant] });
    mockUseAlerts.mockReturnValue({ data: [] });
  });

  it('shows loading state while the dashboard query is pending', () => {
    mockUseSuperAdminDashboard.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });
    renderPage();
    expect(screen.getByText('Cargando indicadores...')).toBeInTheDocument();
  });

  it('shows the error state with retry when the query fails', () => {
    mockUseSuperAdminDashboard.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
      refetch: mockRefetch,
    });
    renderPage();
    expect(screen.getByText('boom')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders the KPI cards and plan distribution chips', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Panel de Control' })).toBeInTheDocument();
    expect(screen.getByText('Clínicas totales')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('340')).toBeInTheDocument();
    expect(screen.getByText('$500')).toBeInTheDocument();
    expect(screen.getByText('free: 5')).toBeInTheDocument();
    expect(screen.getByText('pro: 4')).toBeInTheDocument();
  });

  it('renders the worst health score tenants', () => {
    renderPage();
    expect(screen.getByText('Salud de las clínicas')).toBeInTheDocument();
    expect(screen.getByText('Clínica Uno')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
  });

  it('shows the empty message when there are no alerts', () => {
    mockUseAlerts.mockReturnValue({ data: [] });
    renderPage();
    expect(screen.getByText('Sin alertas activas')).toBeInTheDocument();
  });
});
