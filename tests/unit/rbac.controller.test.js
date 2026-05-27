import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/rbac/rbac.service.js', () => ({
  getUserPermissions: vi.fn(),
}));

import * as rbacService from '../../src/modules/rbac/rbac.service.js';
import * as rbacController from '../../src/modules/rbac/rbac.controller.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('rbacController.getMyPermissions', () => {
  it('returns role and permissions', async () => {
    vi.mocked(rbacService.getUserPermissions).mockResolvedValue(['user:read', 'user:create']);
    const req = { user: { id: 1, role: 'admin' }, tenant_id: 'test-tenant' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    rbacController.getMyPermissions(req, res, next);
    await flush();

    expect(rbacService.getUserPermissions).toHaveBeenCalledWith(1, 'admin', 'test-tenant');
    expect(res.json).toHaveBeenCalledWith({ role: 'admin', permissions: ['user:read', 'user:create'] });
  });
});
