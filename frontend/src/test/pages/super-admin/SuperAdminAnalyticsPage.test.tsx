import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import SuperAdminAnalyticsPage from '@/modules/super-admin/pages/SuperAdminAnalyticsPage';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('@/shared/services/api-client', () => ({ apiClient: { get: mockGet } }));

vi.mock('@/i18n/i18n', () => ({ default: { language: 'es', on: vi.fn() } }));

// Almost every string in this page has an inline fallback (t(key, 'Default')),
// so the generic t below only needs to support string fallbacks.
vi.mock('react-i18next', () => {
  // Stable `t` identity (defined once per module).
  const t = (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key);
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

function mockApiResponses() {
  mockGet.mockImplementation((url: string) => {
    if (url.includes('/revenue')) {
      return Promise.resolve({ data: [{ month: '2026-01', revenue: 1000 }] });
    }
    if (url.includes('/growth')) {
      return Promise.resolve({ data: [{ month: '2026-01', new_users: 10, new_tenants: 2, new_bookings: 50 }] });
    }
    if (url.includes('/churn')) {
      return Promise.resolve({ data: { mrr: 100, arr: 200, churn_rate: 3, annual_retention: 90 } });
    }
    if (url.includes('/operations')) {
      return Promise.resolve({
        data: {
          cancellation_rate: 5,
          no_show_rate: 2,
          avg_lead_days: 3,
          total_bookings_period: 100,
          specialties: [],
          top_doctors: [],
          hourly_demand: [],
        },
      });
    }
    if (url.includes('/comparison')) {
      return Promise.resolve({ data: [{ id: 't1', name: 'Clínica Uno', active: true, total_users: 5, total_doctors: 2, total_bookings: 20, metric_value: 10, health_score: 80 }] });
    }
    if (url.includes('/occupancy')) {
      return Promise.resolve({ data: [{ tenant_name: 'Clínica Uno', occupancy_rate: 70 }] });
    }
    if (url.includes('/top-tenants')) {
      return Promise.resolve({ data: [{ name: 'Clínica Uno', total_bookings: 20 }] });
    }
    return Promise.resolve({ data: [] });
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <SuperAdminAnalyticsPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('SuperAdminAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiResponses();
  });

  it('shows loading state while fetching analytics', () => {
    mockGet.mockImplementation(() => new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Cargando analíticas...')).toBeInTheDocument();
  });

  it('renders the KPI cards and tabs after data loads', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Analíticas de la Plataforma' })).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getByText('$200')).toBeInTheDocument();
    expect(screen.getByText('3%')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Resumen' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ingresos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Crecimiento' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Operación' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Comparación' })).toBeInTheDocument();
  });

  it('renders the overview charts sections', async () => {
    renderPage();
    expect(await screen.findByText('Evolución MRR')).toBeInTheDocument();
    expect(screen.getByText('Crecimiento de Usuarios')).toBeInTheDocument();
    expect(screen.getByText('Top Clínicas por Citas')).toBeInTheDocument();
  });

  it('switches between tabs without crashing', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Analíticas de la Plataforma' });
    fireEvent.click(screen.getByRole('tab', { name: 'Operación' }));
    expect(screen.getByRole('tab', { name: 'Operación' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Comparación' }));
    expect(screen.getByRole('tab', { name: 'Comparación' })).toHaveAttribute('aria-selected', 'true');
  });
});
