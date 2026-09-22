import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/shared/providers/AuthProvider';
import { refreshSession, setUnauthorizedHandler } from '@/shared/services/api-client';

const mockPost = vi.hoisted(() => vi.fn());
const mockAxiosPost = vi.hoisted(() => vi.fn());
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('axios', () => ({
  default: { post: mockAxiosPost },
}));

vi.mock('@/shared/services/api-client', () => ({
  apiClient: { post: mockPost },
  setAccessToken: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
  refreshSession: vi.fn().mockRejectedValue(new Error('No session')),
  announceAccessToken: vi.fn(),
}));

function TestConsumer() {
  const ctx = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(ctx.isLoading)}</span>
      <span data-testid="user">{ctx.user ? JSON.stringify(ctx.user) : 'null'}</span>
      <span data-testid="is-authenticated">{String(ctx.isAuthenticated)}</span>
      <button
        data-testid="btn-login"
        onClick={() => ctx.login('a@b.com', 'pass')}
      >
        login
      </button>
      <button
        data-testid="btn-logout"
        onClick={() => ctx.logout()}
      >
        logout
      </button>
    </div>
  );
}

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

afterEach(() => {
  mockPost.mockReset();
  mockAxiosPost.mockReset();
  mockNavigate.mockReset();
  refreshSession.mockReset();
  refreshSession.mockRejectedValue(new Error('No session'));
  localStorage.clear();
});

describe('AuthProvider', () => {
  it('renders with loading false and user null when no saved session and refresh fails', async () => {
    mockAxiosPost.mockRejectedValue(new Error('No session'));
    renderWithProviders(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  it('does not trust stale localStorage on refresh network failure (no phantom session)', async () => {
    const savedUser = { id: 1, role: 'admin' };
    localStorage.setItem('auth_user', JSON.stringify(savedUser));
    mockAxiosPost.mockRejectedValue(new Error('No session'));
    renderWithProviders(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  it('handles invalid JSON in localStorage gracefully', async () => {
    localStorage.setItem('auth_user', '{invalid}');
    mockAxiosPost.mockRejectedValue(new Error('No session'));
    renderWithProviders(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  it('login calls api and updates user', async () => {
    const userData = { id: 1, role: 'admin' };
    mockPost.mockResolvedValueOnce({ data: { requires_2fa: false, access_token: 'tok', user: userData } });
    renderWithProviders(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    const loginBtn = screen.getByTestId('btn-login');
    await loginBtn.click();
    expect(mockPost).toHaveBeenCalledWith('/auth/login', {
      email: 'a@b.com',
      password: 'pass',
      totp_token: undefined,
      captcha_token: undefined,
    });
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toContain('"role":"admin"');
    });
  });

  it('logout clears user and calls api', async () => {
    const savedUser = { id: 1, role: 'admin' };
    localStorage.setItem('auth_user', JSON.stringify(savedUser));
    mockAxiosPost.mockRejectedValueOnce(new Error('No session'));
    renderWithProviders(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    mockPost.mockResolvedValueOnce({ data: {} });
    const logoutBtn = screen.getByTestId('btn-logout');
    await logoutBtn.click();
    expect(mockPost).toHaveBeenCalledWith('/auth/logout');
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  it('registers the unauthorized handler on mount', async () => {
    renderWithProviders(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(setUnauthorizedHandler).toHaveBeenCalled();
  });

  it('force-logouts at boot when a logout was left pending (no phantom re-login)', async () => {
    localStorage.setItem('auth_logout_pending', '1');
    localStorage.setItem('auth_user', JSON.stringify({ id: 1, role: 'admin' }));
    refreshSession.mockResolvedValueOnce({ access_token: 'tok', user: { id: 1, role: 'admin' } });
    mockPost.mockResolvedValue({ data: {} });
    renderWithProviders(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(mockPost).toHaveBeenCalledWith('/auth/logout');
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(localStorage.getItem('auth_logout_pending')).toBeNull();
  });

  it('logout retries when the server POST fails, then clears local state', async () => {
    renderWithProviders(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    mockPost.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ data: {} });
    const logoutBtn = screen.getByTestId('btn-logout');
    await logoutBtn.click();
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledTimes(2);
    });
    expect(mockPost).toHaveBeenCalledWith('/auth/logout');
    expect(localStorage.getItem('auth_logout_pending')).toBeNull();
    expect(screen.getByTestId('user').textContent).toBe('null');
  });
});
