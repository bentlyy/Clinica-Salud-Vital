import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import SuperAdminTenantsPage from '@/modules/super-admin/pages/SuperAdminTenantsPage';
import type { Tenant, TenantDetail } from '@/modules/super-admin/types/super-admin.types';

const mockUseTenantList = vi.hoisted(() => vi.fn());
const mockUseTenantDetail = vi.hoisted(() => vi.fn());
const mockCreateTenant = vi.hoisted(() => vi.fn());
const mockUpdateTenant = vi.hoisted(() => vi.fn());
const mockDeleteTenant = vi.hoisted(() => vi.fn());
const mockDeleteMutate = vi.hoisted(() => vi.fn());
const mockRefetch = vi.hoisted(() => vi.fn());

vi.mock('@/modules/super-admin/hooks/useSuperAdmin', () => ({
  useTenantList: mockUseTenantList,
  useTenantDetail: mockUseTenantDetail,
  useCreateTenant: mockCreateTenant,
  useUpdateTenant: mockUpdateTenant,
  useDeleteTenant: mockDeleteTenant,
}));

vi.mock('@/i18n/i18n', () => ({ default: { language: 'es', on: vi.fn() } }));

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    loading: 'Cargando clínicas...',
    title: 'Clínicas',
    total_registered: 'Total registradas: {{count}}',
    new_clinic: 'Nueva Clínica',
    search_placeholder: 'Buscar por nombre o slug...',
    empty_title: 'No hay clínicas',
    empty_create: 'Crea la primera clínica',
    empty_search: 'No hay resultados para la búsqueda',
    col_name: 'Nombre',
    col_slug: 'Slug',
    col_plan: 'Plan',
    col_status: 'Estado',
    col_actions: 'Acciones',
    active: 'Activa',
    inactive: 'Inactiva',
    rows_per_page: 'Filas por página',
    delete_title: 'Eliminar clínica',
    delete_confirm: '¿Eliminar a {{name}}?',
    delete_warning: 'Esta acción no se puede deshacer.',
    cancel: 'Cancelar',
    delete_button: 'Eliminar',
    deleting: 'Eliminando...',
    details_section: 'Detalles',
    domain: 'Dominio',
    plan: 'Plan',
    status: 'Estado',
    created: 'Creada',
    stats_section: 'Estadísticas',
    users: 'Usuarios',
    patients: 'Pacientes',
    doctors: 'Doctores',
    bookings: 'Citas',
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

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
  };
});

function makeTenant(id: string, overrides: Partial<Tenant> = {}): Tenant {
  return {
    id,
    name: `Clínica ${id}`,
    slug: id,
    domain: `${id}.clinic.cl`,
    active: true,
    plan: 'free',
    total_bookings: 10,
    total_users: 3,
    total_doctors: 2,
    created_at: '2024-05-01T10:00:00Z',
    logo_url: undefined,
    ...overrides,
  };
}

const detail: TenantDetail = {
  ...makeTenant('t1'),
  plan: 'pro',
  plan_name: 'Pro',
  locale: 'es',
  timezone: 'America/Santiago',
  total_patients: 40,
  confirmed_bookings: 100,
  invoice_count: 8,
  lab_request_count: 12,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <SuperAdminTenantsPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('SuperAdminTenantsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTenantList.mockReturnValue({
      data: { data: [makeTenant('t1'), makeTenant('t2')], total: 2, page: 1, limit: 10, totalPages: 1 },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockUseTenantDetail.mockReturnValue({ data: detail });
    mockCreateTenant.mockReturnValue({ isPending: false, mutate: vi.fn() });
    mockUpdateTenant.mockReturnValue({ isPending: false, mutate: vi.fn() });
    mockDeleteTenant.mockReturnValue({ isPending: false, mutate: mockDeleteMutate });
  });

  it('shows loading state while fetching tenants', () => {
    mockUseTenantList.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });
    renderPage();
    expect(screen.getByText('Cargando clínicas...')).toBeInTheDocument();
  });

  it('shows the error state with retry when the query fails', () => {
    mockUseTenantList.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
      refetch: mockRefetch,
    });
    renderPage();
    expect(screen.getByText('boom')).toBeInTheDocument();
    mockRefetch.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders the tenants table with plan and status chips', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Clínicas' })).toBeInTheDocument();
    expect(screen.getByText('Clínica t1')).toBeInTheDocument();
    expect(screen.getByText('Clínica t2')).toBeInTheDocument();
    expect(screen.getAllByText('Gratuito').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Activa').length).toBeGreaterThanOrEqual(2);
  });

  it('shows the empty state with a CTA when there are no tenants', () => {
    mockUseTenantList.mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 10, totalPages: 0 },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    renderPage();
    expect(screen.getByText('No hay clínicas')).toBeInTheDocument();
    expect(screen.getByText('Crea la primera clínica')).toBeInTheDocument();
  });

  it('opens the create dialog from the header button', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Nueva Clínica' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Nueva Clínica')).toBeInTheDocument();
  });

  it('opens the edit dialog with the selected tenant', () => {
    renderPage();
    const row = screen.getByText('Clínica t1').closest('tr');
    expect(row).not.toBeNull();
    const buttons = within(row as HTMLElement).getAllByRole('button');
    fireEvent.click(buttons[1]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Editar Clínica')).toBeInTheDocument();
  });

  it('opens the delete confirmation and removes the tenant', () => {
    renderPage();
    const row = screen.getByText('Clínica t1').closest('tr');
    const buttons = within(row as HTMLElement).getAllByRole('button');
    fireEvent.click(buttons[2]);
    expect(screen.getByText('Eliminar clínica')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(mockDeleteMutate).toHaveBeenCalledWith('t1', expect.any(Object));
  });

  it('opens the detail drawer with tenant stats', async () => {
    renderPage();
    const row = screen.getByText('Clínica t1').closest('tr');
    const buttons = within(row as HTMLElement).getAllByRole('button');
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(mockUseTenantDetail).toHaveBeenCalledWith('t1'), { timeout: 10000 });
    expect(screen.getByText('Detalles')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });
});
