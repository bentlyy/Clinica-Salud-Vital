import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import AuditPage from '@/modules/audit/pages/AuditPage';

const useAuditList = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({ useAuth: vi.fn() }));
const superAdminService = vi.hoisted(() => ({ listTenants: vi.fn() }));

vi.mock('@/modules/audit/hooks/useAudit', () => ({ useAuditList }));
vi.mock('@/shared/providers/AuthProvider', () => auth);
vi.mock('@/modules/super-admin/services/super-admin.service', () => ({ superAdminService }));
vi.mock('@/i18n/i18n', () => ({ default: { language: 'es', on: vi.fn() } }));

vi.mock('react-i18next', () => {
  const audit: Record<string, string> = {
    title: 'Auditoria',
    subtitle: 'Registro de actividades del sistema',
    loading: 'Cargando auditoría...',
    exportAuditLog: 'Exportar registro de auditoria',
    searchPlaceholder: 'Buscar en auditoria...',
    actionLabel: 'Acción',
    entityLabel: 'Entidad',
    clinicFilter: 'Clínica',
    allClinics: 'Todas las clínicas',
    noAuditLogs: 'No hay registros de auditoria',
    noResultsWithFilters: 'No se encontraron registros con los filtros aplicados',
    user: 'Usuario',
    action: 'Acción',
    entity: 'Entidad',
    details: 'Detalles',
    ipAddress: 'Dirección IP',
    date: 'Fecha',
    actions: 'Acciones',
    rowsLabel: 'Filas por página',
    userFallback: 'Usuario {{id}}',
  };
  const common: Record<string, string> = {
    of: 'de',
    error_default_title: 'Algo salió mal',
    error_default_message: 'Inténtalo nuevamente',
    retry: 'Reintentar',
  };
  return {
    useTranslation: (ns?: string) => ({
      t: (key: string, options?: Record<string, unknown>) => {
        const map = ns === 'common' ? common : audit;
        const value = map[key];
        if (value && options) return value.replace('{{id}}', String(options.id));
        return value ?? key;
      },
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

const response = {
  data: [
    {
      id: 1,
      tenant_id: 1,
      user_id: 7,
      user_name: 'Dra. Ana',
      action: 'create',
      entity_type: 'patient',
      entity_id: 42,
      ip_address: '127.0.0.1',
      created_at: '2026-01-01T12:00:00',
    },
    {
      id: 2,
      tenant_id: 1,
      user_id: 5,
      user_name: undefined,
      action: 'login',
      entity_type: 'user',
      entity_id: undefined,
      ip_address: undefined,
      created_at: '2026-01-01T13:00:00',
    },
  ],
  total: 2,
  page: 1,
  limit: 15,
  totalPages: 1,
};

function renderPage() {
  return render(
    <AppThemeProvider>
      <AuditPage />
    </AppThemeProvider>,
  );
}

describe('AuditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    superAdminService.listTenants.mockResolvedValue({ data: [], total: 0, page: 1, limit: 200, totalPages: 0 });
    auth.useAuth.mockReturnValue({ user: { role: 'admin' } });
  });

  it('shows the loading state while fetching', () => {
    useAuditList.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('Cargando auditoría...')).toBeInTheDocument();
  });

  it('renders the error state with retry when the query fails', () => {
    useAuditList.mockReturnValue({ data: undefined, isLoading: false, error: new Error('boom'), refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('renders the empty state when there are no logs', () => {
    useAuditList.mockReturnValue({ data: { ...response, data: [] }, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('No hay registros de auditoria')).toBeInTheDocument();
  });

  it('renders the table with mapped action/entity labels and the user fallback', () => {
    useAuditList.mockReturnValue({ data: response, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('Auditoria')).toBeInTheDocument();
    expect(screen.getByText('Dra. Ana')).toBeInTheDocument();
    expect(screen.getByText('Usuario 5')).toBeInTheDocument();
    expect(screen.getAllByText('Creación').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Paciente').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('ID: 42')).toBeInTheDocument();
    expect(screen.getByText('127.0.0.1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar registro de auditoria' })).toBeEnabled();
  });

  it('opens the detail dialog when the visibility icon is clicked', () => {
    useAuditList.mockReturnValue({ data: response, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // first row visibility button
    expect(screen.getByText('Detalle de Auditoría')).toBeInTheDocument();
  });

  it('shows the clinic filter for super admins and loads the tenants', async () => {
    auth.useAuth.mockReturnValue({ user: { role: 'superadmin' } });
    superAdminService.listTenants.mockResolvedValue({
      data: [{ id: 't1', name: 'Clínica Norte' }],
      total: 1,
      page: 1,
      limit: 200,
      totalPages: 1,
    });
    useAuditList.mockReturnValue({ data: response, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    await waitFor(() => expect(superAdminService.listTenants).toHaveBeenCalledWith({ page: 1, limit: 200 }));
    expect(screen.getAllByText('Clínica').length).toBeGreaterThanOrEqual(1);
  });
});
