import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/rbac/rbac.service.js', () => ({
  hasPermission: vi.fn(),
}));

import { rbac, canAccessResource } from '../../src/modules/rbac/rbac.middleware.js';
import * as rbacService from '../../src/modules/rbac/rbac.service.js';

let req, res, next;

beforeEach(() => {
  vi.clearAllMocks();
  req = { user: { id: 1, role: 'admin' }, params: {} };
  res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  next = vi.fn();
});

describe('rbac', () => {
  it('allows when user has all required permissions', async () => {
    vi.mocked(rbacService.hasPermission).mockResolvedValue(true);

    const middleware = rbac(['user:create', 'user:read']);
    await middleware(req, res, next);

    expect(rbacService.hasPermission).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when user lacks a permission', async () => {
    vi.mocked(rbacService.hasPermission).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const middleware = rbac(['user:create', 'user:delete']);
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Access denied', required: 'user:delete' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when no user', async () => {
    req.user = undefined;

    const middleware = rbac(['user:create']);
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('canAccessResource', () => {
  it('allows access when user has permission', async () => {
    vi.mocked(rbacService.hasPermission).mockResolvedValue(true);

    const middleware = canAccessResource('user', 'read');
    await middleware(req, res, next);

    expect(rbacService.hasPermission).toHaveBeenCalledWith(1, 'admin', 'user:read');
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when user lacks permission', async () => {
    vi.mocked(rbacService.hasPermission).mockResolvedValue(false);

    const middleware = canAccessResource('user', 'delete');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Access denied', required: 'user:delete' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when no user', async () => {
    req.user = undefined;

    const middleware = canAccessResource('user', 'read');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when non-admin accesses own resource of another user', async () => {
    vi.mocked(rbacService.hasPermission).mockResolvedValue(true);
    req.user.role = 'user';
    req.params.user_id = '5';

    const middleware = canAccessResource('user', 'own');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'You can only access your own resources' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows access when own resource matches user', async () => {
    vi.mocked(rbacService.hasPermission).mockResolvedValue(true);
    req.params.user_id = '1';
    req.user.role = 'user';

    const middleware = canAccessResource('user', 'own');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('allows admin to bypass own resource check', async () => {
    vi.mocked(rbacService.hasPermission).mockResolvedValue(true);
    req.params.user_id = '5';

    const middleware = canAccessResource('user', 'own');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
