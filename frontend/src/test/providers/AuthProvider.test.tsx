import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '@/shared/providers/AuthProvider';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
}));

vi.mock('@/shared/services/api-client', () => ({
  apiClient: { get: mocks.get },
  setUnauthorizedHandler: mocks.setUnauthorizedHandler,
  CORE_LOGIN_URL: '/api/auth/login',
}));

function TestConsumer() {
  const ctx = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(ctx.isLoading)}</span>
      <span data-testid="user">{ctx.user ? JSON.stringify(ctx.user) : 'null'}</span>
      <span data-testid="is-authenticated">{String(ctx.isAuthenticated)}</span>
      <button data-testid="btn-login" onClick={() => ctx.login()}>
        login
      </button>
      <button data-testid="btn-logout" onClick={() => void ctx.logout()}>
        logout
      </button>
    </div>
  );
}

const inicio = {
  usuario: { id: 7, email: 'ana@clinica.com', name: 'Ana', role: 'admin', tenantId: 'org_1' },
  organizacion: { id: 'org_1', slug: 'clinica-norte', nombre: 'Clínica Norte' },
  rol: 'admin',
  herramienta: 'vitaria',
  herramientas: [],
};

function renderWithProvider(ui: React.ReactNode) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

afterEach(() => {
  mocks.get.mockReset();
  mocks.setUnauthorizedHandler.mockReset();
  localStorage.clear();
});

beforeEach(() => {
  mocks.get.mockResolvedValue({ data: inicio });
});

describe('AuthProvider', () => {
  it('bootstraps the session from GET /auth/inicio', async () => {
    renderWithProvider(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(mocks.get).toHaveBeenCalledWith('/auth/inicio');
    expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
    const user = JSON.parse(screen.getByTestId('user').textContent as string);
    expect(user).toMatchObject({
      id: 7,
      email: 'ana@clinica.com',
      name: 'Ana',
      role: 'admin',
      tenant_id: 'org_1',
      tenant_name: 'Clínica Norte',
      tenant_slug: 'clinica-norte',
    });
  });

  it('normalizes the local "user" role into "patient"', async () => {
    mocks.get.mockResolvedValueOnce({
      data: { ...inicio, usuario: { ...inicio.usuario, role: 'user' } },
    });
    renderWithProvider(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(JSON.parse(screen.getByTestId('user').textContent as string).role).toBe('patient');
  });

  it('falls back to no user when the bootstrap request fails', async () => {
    mocks.get.mockRejectedValueOnce(new Error('No session'));
    renderWithProvider(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    });
  });

  it('registers the unauthorized handler on mount', async () => {
    renderWithProvider(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(mocks.setUnauthorizedHandler).toHaveBeenCalled();
  });

  it('redirects to the Core login when login() is invoked', async () => {
    const setter = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        href: 'http://localhost/',
        set href(value: string) {
          setter(value);
        },
      },
    });
    renderWithProvider(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    screen.getByTestId('btn-login').click();
    expect(setter).toHaveBeenCalledWith('/api/auth/login');
  });
});
