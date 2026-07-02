import { render, screen, waitFor, act } from '@testing-library/react';
import { useContext } from 'react';
import { AuthContext, AuthProvider } from '../../context/AuthContext';

const mockPost = vi.hoisted(() => vi.fn());

vi.mock('../../api/axios', () => ({
  default: { post: mockPost },
}));

const TestConsumer = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) return <div>No context</div>;
  return (
    <div>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="user">{ctx.user ? JSON.stringify(ctx.user) : 'null'}</span>
      <button data-testid="btn-login" onClick={() => ctx.login('a@b.com', 'pass')}>
        login
      </button>
      <button data-testid="btn-register" onClick={() => ctx.register({ email: 'a@b.com', password: 'pass' })}>
        register
      </button>
      <button data-testid="btn-logout" onClick={() => ctx.logout()}>
        logout
      </button>
    </div>
  );
};

afterEach(() => {
  mockPost.mockReset();
  localStorage.clear();
});

describe('AuthProvider', () => {
  it('renders with loading false and user null when no saved session', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  it('loads user from localStorage on mount', async () => {
    const savedUser = { id: 1, role: 'admin' };
    localStorage.setItem('user', JSON.stringify(savedUser));
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toContain('"role":"admin"');
    });
  });

  it('handles invalid JSON in localStorage gracefully', async () => {
    localStorage.setItem('user', '{invalid}');
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  it('login calls api and updates user', async () => {
    const userData = { id: 1, role: 'admin', tenant_id: 'default' };
    mockPost.mockResolvedValue({ data: { user: userData } });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    await act(async () => {
      screen.getByTestId('btn-login').click();
    });
    expect(mockPost).toHaveBeenCalledWith('/auth/login', {
      email: 'a@b.com',
      password: 'pass',
    });
    expect(localStorage.getItem('user')).toBe(JSON.stringify(userData));
    expect(localStorage.getItem('tenant_id')).toBe('default');
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toContain('"role":"admin"');
    });
  });

  it('login saves correct tenant_id', async () => {
    const userData = { id: 2, role: 'doctor' };
    mockPost.mockResolvedValue({ data: { user: userData } });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    await act(async () => {
      screen.getByTestId('btn-login').click();
    });
    expect(localStorage.getItem('tenant_id')).toBeNull();
  });

  it('register calls api with correct payload', async () => {
    mockPost.mockResolvedValue({ data: { id: 1 } });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    await act(async () => {
      screen.getByTestId('btn-register').click();
    });
    expect(mockPost).toHaveBeenCalledWith('/auth/register', {
      email: 'a@b.com',
      password: 'pass',
    });
  });

  it('logout clears user and calls api', async () => {
    const userData = { id: 1, role: 'admin' };
    localStorage.setItem('user', JSON.stringify(userData));
    mockPost.mockResolvedValue({ data: {} });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    await act(async () => {
      screen.getByTestId('btn-logout').click();
    });
    expect(mockPost).toHaveBeenCalledWith('/auth/logout');
    expect(localStorage.getItem('user')).toBeNull();
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  it('handles auth:expired event', async () => {
    const userData = { id: 1, role: 'admin' };
    localStorage.setItem('user', JSON.stringify(userData));
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    await act(async () => {
      window.dispatchEvent(new Event('auth:expired'));
    });
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('tenant_id')).toBeNull();
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });
});
