import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import SuperAdminTenantDetailPage from '@/modules/super-admin/pages/SuperAdminTenantDetailPage';
import type { TenantDetail } from '@/modules/super-admin/types/super-admin.types';

const mockGetTenantById = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('@/modules/super-admin/services/super-admin.service', () => ({
  superAdminService: { getTenantById: mockGetTenantById },
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/i18n/i18n', () => ({ default: { language: 'es', on: vi.fn() } }));

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    errorLoad: 'Error al cargar el detalle',
    notFound: 'Clínica no encontrada',
    subtitle: 'Clínica {{slug}}',
    back: 'Volver',
    infoTitle: 'Información',
    labelDomain: 'Dominio',
    labelPlan: 'Plan',
    labelStatus: 'Estado',
    statusActive: 'Activa',
    statusInactive: 'Inactiva',
    labelLocale: 'Idioma',
    labelTimezone: 'Zona horaria',
    labelCreated: 'Creada',
    statsTitle: 'Estadísticas',
    statUsers: 'Usuarios',
    statPatients: 'Pacientes',
    statDoctors: 'Doctores',
    statBookings: 'Citas',
    statInvoices: 'Facturas',
    statLabRequests: 'Exámenes',
    financialTitle: 'Finanzas',
    totalInvoices: 'Total facturado',
    confirmedBookings: 'Citas confirmadas',
    retry: 'Reintentar',
  };
  const interpolate = (str: string, opts?: Record<string, unknown>) =>
    opts ? str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? '')) : str;
  // Stable `t` identity (defined once per module) so useCallback deps don't loop effects.
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

const detail: TenantDetail = {
  id: 't1',
  name: 'Clínica Uno',
  slug: 'uno',
  domain: 'uno.clinic.cl',
  active: true,
  plan: 'pro',
  plan_name: 'Pro',
  locale: 'es',
  timezone: 'America/Santiago',
  created_at: '2024-05-01T10:00:00Z',
  total_bookings: 120,
  total_users: 5,
  total_doctors: 3,
  total_patients: 40,
  confirmed_bookings: 100,
  invoice_count: 8,
  lab_request_count: 12,
  logo_url: undefined,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tenants/t1']}>
      <AppThemeProvider>
        <Routes>
          <Route path="/tenants/:id" element={<SuperAdminTenantDetailPage />} />
        </Routes>
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('SuperAdminTenantDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockGetTenantById.mockResolvedValue(detail);
  });

  it('shows loading while fetching and renders the tenant after it resolves', async () => {
    let resolveFn!: (value: TenantDetail) => void;
    mockGetTenantById.mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      }),
    );
    renderPage();
    expect(screen.getByText('Cargando detalles...')).toBeInTheDocument();
    resolveFn(detail);
    expect(
      await screen.findByRole('heading', { name: 'Clínica Uno' }, { timeout: 10000 }),
    ).toBeInTheDocument();
  });

  it('renders the tenant info, plan, status and stats', async () => {
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Clínica Uno' }, { timeout: 10000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getAllByText('8').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('shows the error state and retries loading', async () => {
    mockGetTenantById.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(
      await screen.findByText('Error al cargar el detalle', {}, { timeout: 10000 }),
    ).toBeInTheDocument();
    mockGetTenantById.mockClear();
    mockGetTenantById.mockResolvedValue(detail);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('heading', { name: 'Clínica Uno' }, { timeout: 10000 }),
    ).toBeInTheDocument();
    expect(mockGetTenantById).toHaveBeenCalledTimes(1);
  });

  it('navigates back to the tenants list', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Clínica Uno' });
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(mockNavigate).toHaveBeenCalledWith('/tenants');
  });
});
