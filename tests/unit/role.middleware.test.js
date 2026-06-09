import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { authorizeRoles } from '../../src/middlewares/role.middleware.js';
import { UnauthorizedError, ForbiddenError } from '../../src/utils/errors.js';

describe('role.middleware authorizeRoles', () => {
  it('allows when user has required role', () => {
    const middleware = authorizeRoles('admin');
    const req = { user: { role: 'admin' } };
    const res = {};
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows when user has one of multiple roles', () => {
    const middleware = authorizeRoles('admin', 'doctor');
    const req = { user: { role: 'doctor' } };
    const res = {};
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects when user does not have required role', () => {
    const middleware = authorizeRoles('admin');
    const req = { user: { role: 'user' } };
    const res = {};
    const next = vi.fn();

    expect(() => middleware(req, res, next)).toThrow(ForbiddenError);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 401 when there is no user', () => {
    const middleware = authorizeRoles('admin');
    const req = {};
    const res = {};
    const next = vi.fn();

    expect(() => middleware(req, res, next)).toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });
});
