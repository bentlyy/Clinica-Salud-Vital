import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import UsersPage from '@/modules/users/pages/UsersPage';
import type { User } from '@/modules/users/types/user.types';

const mockUseUserList = vi.hoisted(() => vi.fn());
const mockUseRegisterDoctor = vi.hoisted(() => vi.fn());
const mockUseInviteUser = vi.hoisted(() => vi.fn());
const mockUseToggleUserActive = vi.hoisted(() => vi.fn());
const mockHasPermission = vi.hoisted(() => vi.fn());
const mockToggleMutate = vi.hoisted(() => vi.fn());
const mockRefetch = vi.hoisted(() => vi.fn());

vi.mock('@/modules/users/hooks/useUsers', () => ({
  useUserList: mockUseUserList,
  useRegisterDoctor: mockUseRegisterDoctor,
  useInviteUser: mockUseInviteUser,
  useToggleUserActive: mockUseToggleUserActive,
}));

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({ hasPermission: mockHasPermission }),
}));

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => {
    const users: Record<string, string> = {
      page_title: 'Usuarios',
      total_users: 'Total de usuarios',
      newUser: 'Nuevo Usuario',
      loading: 'Cargando usuarios...',
      noUsers: 'No hay usuarios',
      try_adjusting_filters: 'Ajusta los filtros o crea un nuevo usuario.',
      deactivate_user: 'Desactivar usuario',
      activate_user: 'Activar usuario',
      deactivate: 'Desactivar',
      activate: 'Activar',
      confirm_toggle: '¿Confirmas la acción para {{name}}?',
      deactivate_warning: 'El usuario perderá el acceso inmediatamente.',
      view_detail: 'Ver detalle',
      status_active: 'Activo',
      status_inactive: 'Inactivo',
    };
    const common: Record<string, string> = {
      rowsPerPage: 'Filas por página',
      of: 'de',
      moreThan: 'más de',
      error_default_title: 'Ha ocurrido un error',
      error_default_message: 'Intenta nuevamente',
      retry: 'Reintentar',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      processing: 'Procesando...',
    };
    const translations = ns === 'common' ? common : users;
    return {
      t: (key: string) => translations[key] ?? key,
      i18n: { language: 'es' },
    };
  },
}));

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
  };
});

function makeUser(id: number, overrides: Partial<User> = {}): User {
  return {
    id,
    email: `user${id}@clinic.cl`,
    name: `Usuario ${id}`,
    role: 'doctor',
    is_active: true,
    created_at: '2024-05-01T10:00:00Z',
    updated_at: '2024-05-01T10:00:00Z',
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <UsersPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockUseUserList.mockReturnValue({
      data: { data: [makeUser(1), makeUser(2)], total: 2 },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockUseRegisterDoctor.mockReturnValue({ isPending: false, mutate: vi.fn() });
    mockUseInviteUser.mockReturnValue({ isPending: false, mutate: vi.fn() });
    mockUseToggleUserActive.mockReturnValue({ isPending: false, mutate: mockToggleMutate });
  });

  it('shows loading state while fetching', () => {
    mockUseUserList.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });
    renderPage();
    expect(screen.getByText('Cargando usuarios...')).toBeInTheDocument();
  });

  it('shows error state with retry when the query fails', () => {
    mockUseUserList.mockReturnValue({
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

  it('renders page title, user rows and pagination', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Usuarios' })).toBeInTheDocument();
    expect(screen.getByText('Usuario 1')).toBeInTheDocument();
    expect(screen.getByText('Usuario 2')).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText('1–2 de 2')).toBeInTheDocument();
  });

  it('shows empty state with a CTA when there are no users', () => {
    mockUseUserList.mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    renderPage();
    expect(screen.getByText('No hay usuarios')).toBeInTheDocument();
    expect(screen.getByText('Ajusta los filtros o crea un nuevo usuario.')).toBeInTheDocument();
  });

  it('opens the create user dialog from the header button', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo Usuario' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens the empty state CTA dialog when no users exist', () => {
    mockUseUserList.mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    renderPage();
    // Header button + empty-state CTA share the same label; the CTA is the second one.
    const newUserButtons = screen.getAllByRole('button', { name: 'Nuevo Usuario' });
    fireEvent.click(newUserButtons[1]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens the detail dialog when the view button is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle Usuario 1' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Usuario 1')).toBeInTheDocument();
  });

  it('confirms deactivation through the confirm dialog', () => {
    mockUseUserList.mockReturnValue({
      data: { data: [makeUser(1, { is_active: true, name: 'Ana' })], total: 1 },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Desactivar usuario')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Desactivar' }));
    expect(mockToggleMutate).toHaveBeenCalledWith(1, expect.any(Object));
  });

  it('hides the create button when the user lacks edit permission', () => {
    mockHasPermission.mockReturnValue(false);
    renderPage();
    expect(screen.queryByRole('button', { name: 'Nuevo Usuario' })).not.toBeInTheDocument();
  });
});
