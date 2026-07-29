import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockVerify } = vi.hoisted(() => ({
  mockVerify: vi.fn(),
}));

vi.mock('../../src/shared/jwt.service.js', () => ({
  jwtManager: { verify: mockVerify, signInvite: vi.fn(() => 'mock-invite-token') },
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [{ token_version: 0 }] }), connect: vi.fn(), on: vi.fn() },
}));

import { authMiddleware, authorize, optionalAuth } from '../../src/middlewares/auth.middleware.js';
import { UnauthorizedError, ForbiddenError } from '../../src/utils/errors.js';

function mockReq(authorization) {
  return {
    headers: { authorization },
    user: undefined,
    tenant_id: 'default',
    locale: 'es',
  };
}

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authMiddleware', () => {
  it('calls next with 401 if no authorization header', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next with 401 if token is invalid', async () => {
    mockVerify.mockReturnValue(null);
    const req = mockReq('Bearer invalid-token');
    const res = mockRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next with 401 if token has invalid format', async () => {
    mockVerify.mockReturnValue(null);
    const req = mockReq('Bearer malformed.token.with.dots');
    const res = mockRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next with 401 for completely malformed token', async () => {
    mockVerify.mockReturnValue(null);
    const req = mockReq('invalid-token-format-no-bearer');
    const res = mockRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('allows superadmin access when tenant_id is NULL', async () => {
    const decoded = { id: 1, email: 'superadmin@test.com', role: 'superadmin', tenant_id: null };
    mockVerify.mockReturnValue(decoded);
    const req = mockReq('Bearer superadmin-token');
    req.tenant_id = null;
    const res = mockRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user.role).toBe('superadmin');
    expect(next).toHaveBeenCalled();
  });

  it('allows superadmin access to tenant resources (tenant_id mismatch)', async () => {
    const decoded = { id: 1, email: 'superadmin@test.com', role: 'superadmin', tenant_id: 'other-tenant' };
    mockVerify.mockReturnValue(decoded);
    const req = mockReq('Bearer superadmin-token');
    req.tenant_id = 'different-tenant';
    const res = mockRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(req.user).toBeDefined();
    expect(next).toHaveBeenCalled();
  });

  it('calls next with 401 if token expired', async () => {
    mockVerify.mockReturnValue(null);
    const req = mockReq('Bearer expired-token');
    const res = mockRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next with decoded user on valid token', async () => {
    const decoded = { id: 1, email: 'test@test.com', role: 'user', tenant_id: 'default' };
    mockVerify.mockReturnValue(decoded);
    const req = mockReq('Bearer valid-token');
    const res = mockRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(req.user).toEqual({ ...decoded, token_version: 0 });
    expect(next).toHaveBeenCalled();
  });
});

describe('optionalAuth', () => {
  it('calls next when no token', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('sets user on valid token', () => {
    const decoded = { id: 1, email: 'test@test.com', role: 'user', tenant_id: 'default' };
    mockVerify.mockReturnValue(decoded);
    const req = mockReq('Bearer valid-token');
    const res = mockRes();
    const next = vi.fn();

    optionalAuth(req, res, next);

    expect(req.user).toEqual({ ...decoded, token_version: 0 });
    expect(next).toHaveBeenCalled();
  });

  it('skips setting user on invalid token', () => {
    mockVerify.mockReturnValue(null);
    const req = mockReq('Bearer invalid-token');
    const res = mockRes();
    const next = vi.fn();

    optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});

describe('authorize', () => {
  it('throws 401 if no user', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    authorize('admin')(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('throws 403 if role not allowed', () => {
    const req = mockReq();
    req.user = { id: 1, email: 'test@test.com', role: 'user', tenant_id: 'default' };
    const res = mockRes();
    const next = vi.fn();

    authorize('admin')(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('calls next if role is allowed', () => {
    const req = mockReq();
    req.user = { id: 1, email: 'test@test.com', role: 'admin', tenant_id: 'default' };
    const res = mockRes();
    const next = vi.fn();

    authorize('admin', 'doctor')(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
