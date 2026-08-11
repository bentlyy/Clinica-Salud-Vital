import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import SuperAdminUsersPage from '@/modules/super-admin/pages/SuperAdminUsersPage';

const mockListTenants = vi.hoisted(() => vi.fn());
const mockListUsers = vi.hoisted(() => vi.fn());
const mockToggleUserActive = vi.hoisted(() => vi.fn());

vi.mock('@/modules/super-admin/services/super-admin.service', () => ({
  superAdminService: {
    listTenants: mockListTenants,
    listUsers: mockListUsers,
    toggleUserActive: mockToggleUserActive,
  },
}));

vi.mock('@/i18n/i18n', () => ({ default: { language: 'es', on: vi.fn() } }));

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    loading: 'Cargando usuarios...',
    errorLoad: 'Error al cargar usuarios',
    errorToggle: 'No se pudo cambiar el estado',
    title: 'Usuarios',
    subtitle: 'Total: {{count}}',
    searchPlaceholder: 'Buscar por nombre o email...',
    roleFilter: 'Rol',
    clinicFilter: 'Clínica',
    allClinics: 'Todas las clínicas',
    emptyTitle: 'Sin usuarios',
    emptySearch: 'No hay resultados para la búsqueda',
    emptyNone: 'No hay usuarios registrados',
    colUser: 'Usuario',
    colEmail: 'Email',
    colRole: 'Rol',
    colClinic: 'Clínica',
    colStatus: 'Estado',
    colActions: 'Acciones',
    deactivate: 'Desactivar',
    reactivate: 'Reactivar',
    noName: 'Sin nombre',
    noClinic: 'Sin clínica',
    rowsPerPage: 'Filas por página',
    retry: 'Reintentar',
    all: 'Todos',
    patients: 'Pacientes',
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

const users = [
  { id: 1, name: 'Ana Pérez', email: 'ana@clinic.cl', role: 'doctor', tenant_id: 't1', active: true },
  { id: 2, name: 'Luis Gómez', email: 'luis@clinic.cl', role: 'admin', tenant_id: null, active: false },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <SuperAdminUsersPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('SuperAdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListTenants.mockResolvedValue({ data: [{ id: 't1', name: 'Clínica Uno' }], total: 1 });
    mockListUsers.mockResolvedValue({ data: users, pagination: { total: 2 } });
    mockToggleUserActive.mockResolvedValue({});
  });

  it('shows loading state while fetching users', () => {
    mockListUsers.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Cargando usuarios...')).toBeInTheDocument();
  });

  it('renders the users table with clinic names', async () => {
    renderPage();
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('ana@clinic.cl')).toBeInTheDocument();
    expect(screen.getByText('Luis Gómez')).toBeInTheDocument();
    // t1 resolved via the clinics list
    expect(screen.getByText('Clínica Uno')).toBeInTheDocument();
    expect(screen.getByText('Sin clínica')).toBeInTheDocument();
  });

  it('toggles a user active status', async () => {
    renderPage();
    await screen.findByText('Ana Pérez');
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    expect(mockToggleUserActive).toHaveBeenCalledWith(1, false);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Reactivar' })).toBeInTheDocument(),
    );
  });

  it('shows the error state and retries loading', async () => {
    mockListUsers.mockRejectedValueOnce(new Error('boom'));
    renderPage();
    expect(
      await screen.findByText('Error al cargar usuarios', {}, { timeout: 10000 }),
    ).toBeInTheDocument();
    mockListUsers.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(mockListUsers).toHaveBeenCalledTimes(1), { timeout: 10000 });
  });

  it('shows the empty state when there are no users', async () => {
    mockListUsers.mockResolvedValue({ data: [], pagination: { total: 0 } });
    renderPage();
    expect(await screen.findByText('Sin usuarios', {}, { timeout: 10000 })).toBeInTheDocument();
  });
});
