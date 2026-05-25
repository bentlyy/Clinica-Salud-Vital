import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockVerify } = vi.hoisted(() => ({
  mockVerify: vi.fn(),
}));

vi.mock('jsonwebtoken', () => ({
  default: { verify: mockVerify },
}));

import { authMiddleware, authorize } from '../../src/middlewares/auth.middleware.js';

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
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authMiddleware', () => {
  it('returns 401 if no authorization header', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 if token is invalid', () => {
    mockVerify.mockImplementation(() => { throw new Error('jwt malformed'); });
    const req = mockReq('Bearer invalid-token');
    const res = mockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('returns 401 with TOKEN_EXPIRED code if token expired', () => {
    const error = new Error('jwt expired');
    error.name = 'TokenExpiredError';
    mockVerify.mockImplementation(() => { throw error; });
    const req = mockReq('Bearer expired-token');
    const res = mockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
  });

  it('calls next with decoded user on valid token', () => {
    const decoded = { id: 1, email: 'test@test.com', role: 'user', tenant_id: 'default' };
    mockVerify.mockReturnValue(decoded);
    const req = mockReq('Bearer valid-token');
    const res = mockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(req.user).toEqual(decoded);
    expect(next).toHaveBeenCalled();
  });
});

describe('authorize', () => {
  it('returns 401 if no user', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    authorize('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
  });

  it('returns 403 if role not allowed', () => {
    const req = mockReq();
    req.user = { id: 1, email: 'test@test.com', role: 'user', tenant_id: 'default' };
    const res = mockRes();
    const next = vi.fn();

    authorize('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
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
