import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import NotificationsPage from '@/modules/notifications/pages/NotificationsPage';

// --- Hoisted mock values ---

const mockHookReturn = vi.hoisted(() => ({
  data: undefined as { data: Record<string, unknown>[]; total: number; totalPages: number } | undefined,
  isLoading: true,
  error: null as Error | null,
  refetch: vi.fn(),
}));

const mockNavigate = vi.hoisted(() => vi.fn());

// --- Mocks ---

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        title: 'Notificaciones',
        total_notifications: '0 notificaciones',
        loading: 'Cargando notificaciones...',
        markAllRead: 'Marcar todo como leido',
        justNow: 'Ahora mismo',
        minutesAgo: 'hace minutos',
        hoursAgo: 'hace horas',
        daysAgo: 'hace dias',
        noNotifications: 'Sin notificaciones',
        no_new_notifications: 'No tienes notificaciones nuevas',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/modules/notifications/hooks/useNotifications', () => ({
  useNotifications: () => mockHookReturn,
  useMarkAsRead: () => ({ mutate: vi.fn(), isPending: false }),
}));

// --- Render helper ---

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <NotificationsPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

// --- Tests ---

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookReturn.isLoading = true;
    mockHookReturn.data = undefined;
    mockHookReturn.error = null;
    mockHookReturn.refetch = vi.fn();
    mockNavigate.mockClear();
  });

  it('shows loading state while data is being fetched', () => {
    mockHookReturn.isLoading = true;
    renderPage();
    expect(screen.getByText('Cargando notificaciones...')).toBeInTheDocument();
  });

  it('renders the page title', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0, totalPages: 0 };
    renderPage();
    expect(screen.getByText('Notificaciones')).toBeInTheDocument();
  });

  it('renders notification list when data is loaded', () => {
    const now = new Date();
    mockHookReturn.isLoading = false;
    mockHookReturn.data = {
      data: [
        {
          id: 1,
          tenant_id: 1,
          user_id: 1,
          title: 'Nueva cita programada',
          message: 'Se ha creado una nueva cita para el 30 de julio',
          type: 'info',
          is_read: false,
          link: '/bookings/1',
          created_at: new Date(now.getTime() - 300000).toISOString(),
        },
        {
          id: 2,
          tenant_id: 1,
          user_id: 1,
          title: 'Cita confirmada',
          message: 'Tu cita con Dr. Perez ha sido confirmada',
          type: 'success',
          is_read: true,
          created_at: new Date(now.getTime() - 3600000).toISOString(),
        },
      ],
      total: 2,
      totalPages: 1,
    };
    renderPage();
    expect(screen.getByText('Nueva cita programada')).toBeInTheDocument();
    expect(
      screen.getByText('Se ha creado una nueva cita para el 30 de julio'),
    ).toBeInTheDocument();
    expect(screen.getByText('Cita confirmada')).toBeInTheDocument();
    expect(
      screen.getByText('Tu cita con Dr. Perez ha sido confirmada'),
    ).toBeInTheDocument();
  });

  it('shows empty state when there are no notifications', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0, totalPages: 0 };
    renderPage();
    expect(screen.getByText('Sin notificaciones')).toBeInTheDocument();
    expect(
      screen.getByText('No tienes notificaciones nuevas'),
    ).toBeInTheDocument();
  });

  it('does not render notification content while loading', () => {
    mockHookReturn.isLoading = true;
    renderPage();
    expect(
      screen.queryByText('Nueva cita programada'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Sin notificaciones')).not.toBeInTheDocument();
  });
});
