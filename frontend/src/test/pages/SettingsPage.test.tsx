import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import SettingsPage from '@/modules/settings/pages/SettingsPage';

// --- Hoisted values (must be declared before vi.mock factories that use them) ---

const mockUser = vi.hoisted(() => ({
  id: 1,
  email: 'admin@clinic.com',
  role: 'admin',
  name: 'Admin User',
  tenant_id: 1,
  tenant_name: 'Clínica Central',
  tenant_slug: 'central',
}));

// --- Mocks ---

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children ?? null,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        title: 'Configuración',
        tab_profile: 'Perfil',
        tab_security: 'Seguridad',
        tab_notifications: 'Notificaciones',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/modules/settings/components/ProfileTab', () => ({
  ProfileTab: () => <div data-testid="profile-tab">Profile content</div>,
}));

vi.mock('@/modules/settings/components/SecurityTab', () => ({
  SecurityTab: () => <div data-testid="security-tab">Security content</div>,
}));

vi.mock('@/modules/notifications/pages/NotificationsPage', () => ({
  default: () => <div data-testid="notifications-tab">Notifications content</div>,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <SettingsPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role = 'admin';
  });

  it('renders the page title and profile tab by default for admin users', () => {
    renderPage();
    expect(screen.getByText('Configuración')).toBeInTheDocument();
    expect(screen.getByText('Perfil')).toBeInTheDocument();
    expect(screen.getByText('Seguridad')).toBeInTheDocument();
    expect(screen.getByTestId('profile-tab')).toBeInTheDocument();
  });

  it('shows the notifications tab for allowed roles', () => {
    renderPage();
    expect(screen.getByText('Notificaciones')).toBeInTheDocument();
  });

  it('hides the notifications tab for roles that cannot view it', () => {
    mockUser.role = 'patient';
    renderPage();
    expect(screen.queryByText('Notificaciones')).not.toBeInTheDocument();
  });

  it('switches to the security tab when clicked', () => {
    renderPage();
    expect(screen.queryByTestId('security-tab')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Seguridad'));
    expect(screen.getByTestId('security-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-tab')).not.toBeInTheDocument();
  });

  it('switches to the notifications tab when clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('Notificaciones'));
    expect(screen.getByTestId('notifications-tab')).toBeInTheDocument();
  });
});
