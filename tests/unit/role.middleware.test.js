import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { authorizeRoles } from '../../src/middlewares/role.middleware.js';

describe('role.middleware authorizeRoles', () => {
  it('allows when user has required role', () => {
    const middleware = authorizeRoles('admin');
    const req = { user: { role: 'admin' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows when user has one of multiple roles', () => {
    const middleware = authorizeRoles('admin', 'doctor');
    const req = { user: { role: 'doctor' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects when user does not have required role', () => {
    const middleware = authorizeRoles('admin');
    const req = { user: { role: 'user' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 401 when there is no user', () => {
    const middleware = authorizeRoles('admin');
    const req = {};
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
