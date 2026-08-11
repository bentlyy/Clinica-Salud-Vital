import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockForbiddenError = vi.fn((message) => ({ name: 'ForbiddenError', message }));
vi.mock('../../src/utils/errors.js', () => ({
  ForbiddenError: function ForbiddenError(message) {
    return mockForbiddenError(message);
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('csrf middleware', () => {
  it('sets the csrf cookie when missing and continues', async () => {
    const { csrfProtection } = await import('../../src/middlewares/csrf.middleware.js');
    const req = { cookies: {}, method: 'POST' };
    const res = { cookie: vi.fn() };
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith('csrf_token', expect.any(String), expect.objectContaining({
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
    }));
    expect(next).toHaveBeenCalled();
  });

  it('skips validation for safe methods', async () => {
    const { csrfProtection } = await import('../../src/middlewares/csrf.middleware.js');
    const req = { cookies: { csrf_token: 'tok' }, method: 'GET' };
    const res = { cookie: vi.fn() };
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('allows non-safe methods when the header matches the cookie', async () => {
    const { csrfProtection } = await import('../../src/middlewares/csrf.middleware.js');
    const req = { cookies: { csrf_token: 'tok' }, method: 'POST', headers: { 'x-csrf-token': 'tok' } };
    const res = { cookie: vi.fn() };
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockForbiddenError).not.toHaveBeenCalled();
  });

  it('rejects non-safe methods when the header is missing', async () => {
    const { csrfProtection } = await import('../../src/middlewares/csrf.middleware.js');
    const req = { cookies: { csrf_token: 'tok' }, method: 'POST', headers: {} };
    const res = { cookie: vi.fn() };
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(mockForbiddenError).toHaveBeenCalledWith('CSRF token mismatch');
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'ForbiddenError' }));
  });

  it('rejects non-safe methods when the header does not match the cookie', async () => {
    const { csrfProtection } = await import('../../src/middlewares/csrf.middleware.js');
    const req = { cookies: { csrf_token: 'tok' }, method: 'PUT', headers: { 'x-csrf-token': 'other' } };
    const res = { cookie: vi.fn() };
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(mockForbiddenError).toHaveBeenCalledWith('CSRF token mismatch');
  });
});
