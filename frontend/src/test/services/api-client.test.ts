import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => {
  const requestInterceptors: Array<(config: Record<string, unknown>) => Record<string, unknown>> = [];
  const responseInterceptors: Array<{
    ok: (res: Record<string, unknown>) => Record<string, unknown>;
    err: (err: Record<string, unknown>) => Promise<unknown>;
  }> = [];

  const mockApi = vi.fn() as unknown as Record<string, unknown> & (() => unknown);
  mockApi.get = vi.fn();
  mockApi.post = vi.fn();
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

  const mockAxiosPost = vi.fn();

  return { requestInterceptors, responseInterceptors, mockApi, mockAxiosPost };
});

vi.mock('axios', () => ({
  default: {
    create: () => state.mockApi,
    post: state.mockAxiosPost,
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
import {
  apiClient,
  getAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from '@/shared/services/api-client';

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
    setAccessToken(null);
  });

  it('adds the Authorization header when a token is set', () => {
    setAccessToken('token-abc');
    const config = makeConfig();
    const result = requestInterceptor()(config);
    expect(result.headers).toMatchObject({ Authorization: 'Bearer token-abc' });
  });

  it('does not add Authorization when no token is set', () => {
    const config = makeConfig();
    const result = requestInterceptor()(config);
    expect((result.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('adds the tenant id header from localStorage', () => {
    localStorage.setItem('tenant_id', 'tenant-9');
    const result = requestInterceptor()(makeConfig());
    expect(result.headers).toMatchObject({ 'X-Tenant-Id': 'tenant-9' });
  });

  it('adds the CSRF token only for non-safe methods', () => {
    localStorage.setItem('csrf_token', 'csrf-1');
    const getConfig = requestInterceptor()(makeConfig({ method: 'get' }));
    expect((getConfig.headers as Record<string, string>)['X-CSRF-Token']).toBeUndefined();

    const postConfig = requestInterceptor()(makeConfig({ method: 'post' }));
    expect(postConfig.headers).toMatchObject({ 'X-CSRF-Token': 'csrf-1' });
  });

  it('prefers the csrf token from the cookie over localStorage', () => {
    document.cookie = 'csrf_token=cookie-csrf';
    localStorage.setItem('csrf_token', 'local-csrf');
    const postConfig = requestInterceptor()(makeConfig({ method: 'post' }));
    expect(postConfig.headers).toMatchObject({ 'X-CSRF-Token': 'cookie-csrf' });
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });
});

describe('api-client response interceptor (success)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores the CSRF token returned by the server', () => {
    responseInterceptor().ok({ headers: { 'x-csrf-token': 'csrf-server' } });
    expect(localStorage.getItem('csrf_token')).toBe('csrf-server');
  });

  it('stores the tenant id returned by the server', () => {
    responseInterceptor().ok({ headers: { 'x-tenant-id': 'tenant-server' } });
    expect(localStorage.getItem('tenant_id')).toBe('tenant-server');
  });

  it('passes the response through unchanged', () => {
    const response = { data: { ok: true }, headers: {} };
    expect(responseInterceptor().ok(response)).toBe(response);
  });
});

describe('api-client response interceptor (errors)', () => {
  beforeEach(() => {
    setAccessToken(null);
    setUnauthorizedHandler(null);
    state.mockApi.mockClear();
    state.mockAxiosPost.mockReset();
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

  it('shows a session-expired toast on 401 for a retried request', async () => {
    const error = makeApiError(401, makeConfig({ _retry: true }));
    await expect(responseInterceptor().err(error)).rejects.toBe(error);
    expect(toastError()).toHaveBeenCalledWith('errors:sessionExpired');
  });

  it('does not show a toast for failed refresh calls', async () => {
    const error = makeApiError(401, makeConfig({ url: '/api/auth/refresh' }));
    await expect(responseInterceptor().err(error)).rejects.toBe(error);
    expect(toastError()).not.toHaveBeenCalled();
    expect(state.mockAxiosPost).not.toHaveBeenCalled();
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

  it('refreshes the session on 401 and retries the original request', async () => {
    setAccessToken('expired-token');
    state.mockAxiosPost.mockResolvedValue({ data: { access_token: 'new-token', user: {} } });

    const originalRequest = { url: '/bookings', headers: {}, _retry: false } as Record<string, unknown>;
    const error = { response: { status: 401 }, config: originalRequest };

    await responseInterceptor().err(error);

    expect(state.mockAxiosPost).toHaveBeenCalledWith(
      '/api/auth/refresh',
      {},
      expect.objectContaining({ withCredentials: true }),
    );
    expect(originalRequest.headers).toMatchObject({ Authorization: 'Bearer new-token' });
    expect(state.mockApi).toHaveBeenCalledWith(originalRequest);
    expect(getAccessToken()).toBe('new-token');
  });

  it('calls the unauthorized handler and clears the token when refresh fails', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    state.mockAxiosPost.mockRejectedValue(new Error('refresh failed'));

    const originalRequest = { url: '/bookings', headers: {} } as Record<string, unknown>;
    const error = { response: { status: 401 }, config: originalRequest };

    await expect(responseInterceptor().err(error)).rejects.toBe(error);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });

  it('does not retry a request that already retried once', async () => {
    const originalRequest = { url: '/bookings', headers: {}, _retry: true } as Record<string, unknown>;
    const error = { response: { status: 401 }, config: originalRequest };

    await expect(responseInterceptor().err(error)).rejects.toBe(error);
    expect(state.mockAxiosPost).not.toHaveBeenCalled();
  });

  it('exports the apiClient instance', () => {
    expect(apiClient).toBe(state.mockApi);
  });
});
