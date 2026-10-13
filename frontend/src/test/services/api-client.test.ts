import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => {
  const requestInterceptors: Array<(config: Record<string, unknown>) => Record<string, unknown>> = [];
  const responseInterceptors: Array<{
    ok: (res: Record<string, unknown>) => Record<string, unknown>;
    err: (err: Record<string, unknown>) => Promise<unknown>;
  }> = [];

  const mockApi = vi.fn() as unknown as Record<string, unknown> & (() => unknown);
  mockApi.get = vi.fn();
  mockApi.interceptors = {
    request: { use: (fn: (config: Record<string, unknown>) => Record<string, unknown>) => requestInterceptors.push(fn) },
    response: {
      use: (
        ok: (res: Record<string, unknown>) => Record<string, unknown>,
        err: (err: Record<string, unknown>) => Promise<unknown>,
      ) => responseInterceptors.push({ ok, err }),
    },
  };
  mockApi.defaults = {};

  return { requestInterceptors, responseInterceptors, mockApi };
});

vi.mock('axios', () => ({
  default: {
    create: () => state.mockApi,
    isCancel: (error: { code?: string } | null | undefined) => error?.code === 'ERR_CANCELED',
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn() },
}));

vi.mock('@/i18n/i18n', () => ({
  default: { t: (key: string) => key },
}));

import toast from 'react-hot-toast';
import { apiClient, setUnauthorizedHandler, CORE_LOGIN_URL } from '@/shared/services/api-client';

const requestInterceptor = () => state.requestInterceptors[0];
const responseInterceptor = () => state.responseInterceptors[0];
const toastError = () => (toast as unknown as { error: ReturnType<typeof vi.fn> }).error;

function makeConfig(overrides: Record<string, unknown> = {}) {
  return { headers: {}, method: 'get', url: '/resource', ...overrides };
}

function makeApiError(status: number, config: Record<string, unknown>, data: Record<string, unknown> = {}) {
  return { response: { status, data }, config };
}

describe('api-client request interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds the CSRF token only for non-safe methods', () => {
    document.cookie = 'csrf_token=csrf-1';
    const getConfig = requestInterceptor()(makeConfig({ method: 'get' }));
    expect((getConfig.headers as Record<string, string>)['X-CSRF-Token']).toBeUndefined();

    const postConfig = requestInterceptor()(makeConfig({ method: 'post' }));
    expect(postConfig.headers).toMatchObject({ 'X-CSRF-Token': 'csrf-1' });
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('reads the CSRF token from the cookie (never from localStorage)', () => {
    document.cookie = 'csrf_token=cookie-csrf';
    localStorage.setItem('csrf_token', 'local-csrf');
    const postConfig = requestInterceptor()(makeConfig({ method: 'post' }));
    expect(postConfig.headers).toMatchObject({ 'X-CSRF-Token': 'cookie-csrf' });
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('does not attach any Authorization header (SSO uses the cookie)', () => {
    localStorage.setItem('access_token', 'legacy-token');
    const result = requestInterceptor()(makeConfig());
    expect((result.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});

describe('api-client response interceptor (success)', () => {
  it('passes the response through unchanged', () => {
    const response = { data: { ok: true }, headers: {} };
    expect(responseInterceptor().ok(response)).toBe(response);
  });

  it('does not persist server-issued headers in storage', () => {
    localStorage.clear();
    responseInterceptor().ok({ headers: { 'x-tenant-id': 'tenant-server' } });
    expect(localStorage.getItem('tenant_id')).toBeNull();
  });
});

describe('api-client response interceptor (errors)', () => {
  beforeEach(() => {
    setUnauthorizedHandler(null);
    toastError().mockClear();
    localStorage.clear();
  });

  it('rejects cancelled requests without showing toasts', async () => {
    const cancelError = { code: 'ERR_CANCELED' };
    await expect(responseInterceptor().err(cancelError)).rejects.toBe(cancelError);
    expect(toastError()).not.toHaveBeenCalled();
  });

  it('shows a toast with the server message on 400', async () => {
    const error = makeApiError(400, makeConfig(), { error: 'Bad data' });
    await expect(responseInterceptor().err(error)).rejects.toBe(error);
    expect(toastError()).toHaveBeenCalledWith('Bad data');
  });

  it('shows a generic toast on 400 without a message', async () => {
    const error = makeApiError(400, makeConfig());
    await expect(responseInterceptor().err(error)).rejects.toBe(error);
    expect(toastError()).toHaveBeenCalledWith('errors:badRequest');
  });

  it('redirects to the Core login and warns once on 401', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    const error = makeApiError(401, makeConfig());
    await expect(responseInterceptor().err(error)).rejects.toBe(error);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(toastError()).toHaveBeenCalledWith('errors:sessionExpired');
  });

  it('does not double-fire the unauthorized handler for a burst of 401s', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    const flush = async () => {
      try {
        await responseInterceptor().err(makeApiError(401, makeConfig()));
      } catch {
        // expected — the interceptor rejects the original error
      }
    };
    await Promise.all([flush(), flush()]);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(toastError().mock.calls.filter((c) => c[0] === 'errors:sessionExpired')).toHaveLength(1);
  });

  it('shows an access-denied toast on 403', async () => {
    const error = makeApiError(403, makeConfig());
    await expect(responseInterceptor().err(error)).rejects.toBe(error);
    expect(toastError()).toHaveBeenCalledWith('errors:accessDenied');
  });

  it('shows a not-found toast on 404', async () => {
    const error = makeApiError(404, makeConfig());
    await expect(responseInterceptor().err(error)).rejects.toBe(error);
    expect(toastError()).toHaveBeenCalledWith('errors:notFound');
  });

  it('shows a conflict toast on 409', async () => {
    const error = makeApiError(409, makeConfig());
    await expect(responseInterceptor().err(error)).rejects.toBe(error);
    expect(toastError()).toHaveBeenCalledWith('errors:conflict');
  });

  it('shows a rate-limit toast on 429', async () => {
    const error = makeApiError(429, makeConfig());
    await expect(responseInterceptor().err(error)).rejects.toBe(error);
    expect(toastError()).toHaveBeenCalledWith('errors:rateLimited');
  });

  it('shows a server-error toast on 500', async () => {
    const error = makeApiError(500, makeConfig());
    await expect(responseInterceptor().err(error)).rejects.toBe(error);
    expect(toastError()).toHaveBeenCalledWith('errors:serverError');
  });

  it('shows a network-error toast when there is no status', async () => {
    const error = { config: makeConfig() };
    await expect(responseInterceptor().err(error)).rejects.toBe(error);
    expect(toastError()).toHaveBeenCalledWith('errors:networkError');
  });

  it('exports the apiClient instance and the Core login URL', () => {
    expect(apiClient).toBe(state.mockApi);
    expect(CORE_LOGIN_URL).toBe('/api/auth/login');
  });
});
