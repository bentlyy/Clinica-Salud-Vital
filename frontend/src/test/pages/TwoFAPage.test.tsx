import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import TwoFAPage from '@/modules/2fa/pages/TwoFAPage';

const auth = vi.hoisted(() => ({
  login: vi.fn(),
  state: { user: null as Record<string, unknown> | null, isAuthenticated: false, isLoading: false },
}));
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({ login: auth.login, ...auth.state }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage() {
  return render(
    <AppThemeProvider>
      <TwoFAPage />
    </AppThemeProvider>,
  );
}

describe('TwoFAPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.state = { user: null, isAuthenticated: false, isLoading: false };
  });

  it('renders the handoff notice (2FA is handled by the Core)', () => {
    renderPage();
    expect(screen.getByText('Verificación en Dos Pasos')).toBeInTheDocument();
    expect(screen.getByText(/La verificación la gestiona tu cuenta central AMG/)).toBeInTheDocument();
  });

  it('redirects to the Core login when there is no session', async () => {
    renderPage();
    await waitFor(() => {
      expect(auth.login).toHaveBeenCalled();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('enters the dashboard when a session already exists', async () => {
    auth.state = { user: { role: 'admin' }, isAuthenticated: true, isLoading: false };
    renderPage();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});
