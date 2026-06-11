import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('CSRF Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow state-changing requests without CSRF cookie (new session)', async () => {
    const { csrfProtection } = await import('../../src/middlewares/csrf.middleware.js');
    const req = { method: 'POST', cookies: {}, headers: {} };
    const res = {};
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should allow state-changing requests without CSRF header (SameSite protects)', async () => {
    const { csrfProtection } = await import('../../src/middlewares/csrf.middleware.js');
    const req = {
      method: 'POST',
      cookies: { 'csrf-token': 'test-token' },
      headers: {},
    };
    const res = {};
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should reject when CSRF tokens do not match', async () => {
    const { csrfProtection } = await import('../../src/middlewares/csrf.middleware.js');
    const req = {
      method: 'POST',
      cookies: { 'csrf-token': 'same-length-token-a' },
      headers: { 'x-csrf-token': 'same-length-token-b' },
    };
    const res = {};
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalled();
    const errorArg = next.mock.calls[0][0];
    expect(errorArg).toBeDefined();
    expect(errorArg.statusCode).toBe(400);
    expect(errorArg.message).toMatch(/CSRF token mismatch/i);
  });

  it('should allow GET requests without CSRF check', async () => {
    const { csrfProtection } = await import('../../src/middlewares/csrf.middleware.js');
    const req = { method: 'GET', cookies: {}, headers: {} };
    const res = {};
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should allow HEAD and OPTIONS without CSRF check', async () => {
    const { csrfProtection } = await import('../../src/middlewares/csrf.middleware.js');

    for (const method of ['HEAD', 'OPTIONS']) {
      const req = { method, cookies: {}, headers: {} };
      const res = {};
      const next = vi.fn();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalledWith();
    }
  });

  it('should accept when CSRF cookie and header match', async () => {
    const { csrfProtection } = await import('../../src/middlewares/csrf.middleware.js');
    const req = {
      method: 'POST',
      cookies: { 'csrf-token': 'valid-token' },
      headers: { 'x-csrf-token': 'valid-token' },
    };
    const res = {};
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});

describe('Auth Middleware - Token Version', () => {
  const { mockVerify } = vi.hoisted(() => ({
    mockVerify: vi.fn(),
  }));

  const { mockPoolQuery } = vi.hoisted(() => ({
    mockPoolQuery: vi.fn(),
  }));

  vi.mock('../../src/shared/jwt.service.js', () => ({
    jwtManager: { verify: mockVerify, signInvite: vi.fn(() => 'mock-invite-token') },
  }));

  vi.mock('../../src/shared/db.js', () => ({
    pool: { query: mockPoolQuery, connect: vi.fn(), on: vi.fn() },
  }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject when token_version mismatches DB', async () => {
    mockVerify.mockReturnValue({
      id: 1,
      email: 'test@test.com',
      role: 'user',
      tenant_id: 'tenant-1',
      token_version: 1,
    });

    mockPoolQuery.mockResolvedValueOnce({ rows: [{ token_version: 2 }] });

    const { authMiddleware } = await import('../../src/middlewares/auth.middleware.js');

    const req = {
      headers: { authorization: 'Bearer valid-token' },
      tenant_id: 'tenant-1',
    };
    const res = {};
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error).toBeDefined();
    expect(error.message).toMatch(/Token revoked/i);
  });

  it('should accept when token_version matches DB', async () => {
    mockVerify.mockReturnValue({
      id: 1,
      email: 'test@test.com',
      role: 'user',
      tenant_id: 'tenant-1',
      token_version: 1,
    });

    mockPoolQuery.mockResolvedValueOnce({ rows: [{ token_version: 1 }] });

    const { authMiddleware } = await import('../../src/middlewares/auth.middleware.js');

    const req = {
      headers: { authorization: 'Bearer valid-token' },
      tenant_id: 'tenant-1',
    };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('should reject when JWT verify returns null', async () => {
    mockVerify.mockReturnValue(null);

    const { authMiddleware } = await import('../../src/middlewares/auth.middleware.js');

    const req = {
      headers: { authorization: 'Bearer invalid-token' },
      tenant_id: 'tenant-1',
    };
    const res = {};
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error).toBeDefined();
    expect(error.message).toMatch(/Invalid token/i);
  });

  it('should reject when no token is provided', async () => {
    const { authMiddleware } = await import('../../src/middlewares/auth.middleware.js');

    const req = { headers: {}, tenant_id: 'tenant-1' };
    const res = {};
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error).toBeDefined();
    expect(error.message).toMatch(/Token required/i);
  });
});
