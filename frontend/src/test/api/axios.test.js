import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

const mockAxiosInstance = Object.assign(
  vi.fn(() => Promise.resolve({ data: {} })),
  {
    defaults: { baseURL: '/api' },
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  }
);

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
    isCancel: vi.fn(() => false),
    post: vi.fn(),
  },
}));

describe('axios instance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset modules to re-evaluate axios.create
    vi.resetModules();
  });

  it('creates axios instance with correct config', async () => {
    import.meta.env.VITE_API_URL = '/api';
    const apiModule = await import('../../api/axios.js');
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: '/api',
      withCredentials: true,
    });
  });

  it('throws if VITE_API_URL is not set', async () => {
    const originalUrl = import.meta.env.VITE_API_URL;
    import.meta.env.VITE_API_URL = '';
    await expect(import('../../api/axios.js')).rejects.toThrow('VITE_API_URL');
    import.meta.env.VITE_API_URL = originalUrl;
  });
});

describe('request interceptor', () => {
  let requestHandler;
  let apiModule;

  beforeEach(async () => {
    import.meta.env.VITE_API_URL = '/api';
    localStorage.clear();
    vi.resetModules();
    apiModule = await import('../../api/axios.js');
    requestHandler = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
  });

  it('adds X-Tenant-Id header from localStorage', () => {
    localStorage.setItem('tenant_id', 'tenant-123');
    const config = requestHandler({ headers: {}, method: 'get' });
    expect(config.headers['X-Tenant-Id']).toBe('tenant-123');
  });

  it('adds X-CSRF-Token for non-GET requests', () => {
    localStorage.setItem('csrf_token', 'csrf-abc');
    const config = requestHandler({ headers: {}, method: 'post' });
    expect(config.headers['X-CSRF-Token']).toBe('csrf-abc');
  });

  it('does not add CSRF token for GET requests', () => {
    localStorage.setItem('csrf_token', 'csrf-abc');
    const config = requestHandler({ headers: {}, method: 'get' });
    expect(config.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('does not add CSRF token for HEAD requests', () => {
    localStorage.setItem('csrf_token', 'csrf-abc');
    const config = requestHandler({ headers: {}, method: 'head' });
    expect(config.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('does not add X-Tenant-Id if not in localStorage', () => {
    const config = requestHandler({ headers: {}, method: 'get' });
    expect(config.headers['X-Tenant-Id']).toBeUndefined();
  });

  it('passes through on request error', async () => {
    const errorHandler = mockAxiosInstance.interceptors.request.use.mock.calls[0][1];
    const error = new Error('Network error');
    await expect(errorHandler(error)).rejects.toThrow('Network error');
  });
});

describe('response interceptor', () => {
  let responseHandler, errorHandler;
  let apiModule;

  beforeEach(async () => {
    import.meta.env.VITE_API_URL = '/api';
    vi.clearAllMocks();
    localStorage.clear();
    vi.resetModules();
    apiModule = await import('../../api/axios.js');
    responseHandler = mockAxiosInstance.interceptors.response.use.mock.calls[0][0];
    errorHandler = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
  });

  it('saves CSRF token from response headers', () => {
    const response = { headers: { 'x-csrf-token': 'new-csrf-token' } };
    responseHandler(response);
    expect(localStorage.getItem('csrf_token')).toBe('new-csrf-token');
  });

  it('returns response unchanged', () => {
    const response = { headers: {}, data: { success: true } };
    const result = responseHandler(response);
    expect(result).toBe(response);
  });

  it('handles 401 with TOKEN_EXPIRED: refreshes and retries', async () => {
    const mockPost = vi.fn().mockResolvedValue({ data: { access_token: 'new-token' } });
    axios.post = mockPost;
    mockAxiosInstance.post = mockPost;

    const error = {
      response: { status: 401, data: { code: 'TOKEN_EXPIRED' } },
      config: { headers: {}, url: '/api/bookings' },
    };

    const result = await errorHandler(error);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/auth/refresh',
      {},
      { withCredentials: true }
    );
  });

  it('handles 401 with TOKEN_EXPIRED: dispatches auth:expired on refresh failure', async () => {
    axios.post = vi.fn().mockRejectedValue(new Error('Refresh failed'));

    const dispatchSpy = vi.fn();
    window.dispatchEvent = dispatchSpy;

    const error = {
      response: { status: 401, data: { code: 'TOKEN_EXPIRED' } },
      config: { headers: {} },
    };

    await expect(errorHandler(error)).rejects.toThrow();
    expect(localStorage.getItem('user')).toBeNull();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('handles 401 without TOKEN_EXPIRED: clears session', async () => {
    const dispatchSpy = vi.fn();
    window.dispatchEvent = dispatchSpy;

    const error = {
      response: { status: 401, data: {} },
      config: { headers: {} },
    };

    await expect(errorHandler(error)).rejects.toThrow('Unauthorized');
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('passes through cancelled requests', async () => {
    axios.isCancel = vi.fn(() => true);
    const error = { __CANCEL__: true };
    await expect(errorHandler(error)).rejects.toBe(error);
  });

  it('rejects other errors', async () => {
    const error = { response: { status: 500, data: { error: 'Server error' } }, config: { headers: {} } };
    await expect(errorHandler(error)).rejects.toBe(error);
  });
});
