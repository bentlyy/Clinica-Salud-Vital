import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import SuperAdminBillingPage from '@/modules/super-admin/pages/SuperAdminBillingPage';

const mockListTenants = vi.hoisted(() => vi.fn());
const mockGetBillingSummary = vi.hoisted(() => vi.fn());

vi.mock('@/modules/super-admin/services/super-admin.service', () => ({
  superAdminService: {
    listTenants: mockListTenants,
    getBillingSummary: mockGetBillingSummary,
  },
}));

vi.mock('@/i18n/i18n', () => ({ default: { language: 'es', on: vi.fn() } }));

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    loading: 'Cargando facturación...',
    errorLoad: 'Error al cargar la facturación',
    title: 'Facturación',
    subtitle: 'Resumen de facturación por clínica',
    totalBilled: 'Total facturado',
    totalPaid: 'Total pagado',
    totalPending: 'Total pendiente',
    overdueInvoices: 'Facturas vencidas',
    searchPlaceholder: 'Buscar clínica...',
    clinicFilter: 'Clínica',
    allClinics: 'Todas las clínicas',
    emptyTitle: 'Sin facturación',
    emptyMessage: 'No hay datos de facturación disponibles',
    colClinic: 'Clínica',
    colInvoices: 'Facturas',
    colBilled: 'Facturado',
    colPaid: 'Pagado',
    colPending: 'Pendiente',
    colOverdue: 'Vencidas',
    colStatus: 'Estado',
    active: 'Activa',
    inactive: 'Inactiva',
    retry: 'Reintentar',
  };
  // Stable `t` identity (defined once per module) so useCallback deps don't loop effects.
  const t = (key: string, opts?: Record<string, unknown> | string) => {
    const mapped = translations[key];
    if (mapped) return mapped;
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

const row = {
  id: 't1',
  name: 'Clínica Uno',
  slug: 'uno',
  active: true,
  invoice_count: 5,
  total_billed: 1000,
  total_paid: 750,
  total_pending: 250,
  overdue_count: 2,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <SuperAdminBillingPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('SuperAdminBillingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListTenants.mockResolvedValue({ data: [{ id: 't1', name: 'Clínica Uno' }], total: 1 });
    mockGetBillingSummary.mockResolvedValue({ data: [row] });
  });

  it('shows loading state while fetching billing data', () => {
    mockGetBillingSummary.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Cargando facturación...')).toBeInTheDocument();
  });

  it('renders the summary cards and the billing table', async () => {
    renderPage();
    expect(await screen.findByText('Total facturado')).toBeInTheDocument();
    expect(screen.getAllByText(/\$1\.000/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/\$750/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Clínica Uno')).toBeInTheDocument();
    expect(screen.getByText('uno')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('shows the error state with retry', async () => {
    mockGetBillingSummary.mockRejectedValueOnce(new Error('boom'));
    renderPage();
    expect(
      await screen.findByText('Error al cargar la facturación', {}, { timeout: 10000 }),
    ).toBeInTheDocument();
    mockGetBillingSummary.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockGetBillingSummary).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state when there are no billing rows', async () => {
    mockGetBillingSummary.mockResolvedValue({ data: [] });
    renderPage();
    expect(await screen.findByText('Sin facturación', {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText('No hay datos de facturación disponibles')).toBeInTheDocument();
  });
});
