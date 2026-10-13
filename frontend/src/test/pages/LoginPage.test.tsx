import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import LoginPage from '@/modules/auth/pages/LoginPage';

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
    <MemoryRouter>
      <AppThemeProvider>
        <LoginPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.state = { user: null, isAuthenticated: false, isLoading: false };
  });

  it('renders the SSO handoff screen', () => {
    renderPage();
    expect(screen.getByText('Vitaria')).toBeInTheDocument();
    expect(screen.getByText(/Redirigiendo al acceso central/)).toBeInTheDocument();
  });

  it('redirects to the Core login when there is no session', async () => {
    renderPage();
    await waitFor(() => {
      expect(auth.login).toHaveBeenCalled();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('enters the dashboard when an admin session already exists', async () => {
    auth.state = { user: { role: 'admin' }, isAuthenticated: true, isLoading: false };
    renderPage();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('enters the SaaS console for a superadmin session', async () => {
    auth.state = { user: { role: 'superadmin' }, isAuthenticated: true, isLoading: false };
    renderPage();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/saas', { replace: true });
    });
  });

  it('waits while the session is still loading', () => {
    auth.state = { user: null, isAuthenticated: false, isLoading: true };
    renderPage();
    expect(auth.login).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
