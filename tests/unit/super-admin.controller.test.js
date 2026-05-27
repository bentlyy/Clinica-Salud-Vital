import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/super-admin/super-admin.service.js', () => ({
  listTenants: vi.fn(),
  getTenantDetail: vi.fn(),
  updateTenant: vi.fn(),
  deleteTenant: vi.fn(),
  getGlobalStats: vi.fn(),
  adminCreateTenant: vi.fn(),
}));

import * as superAdminService from '../../src/modules/super-admin/super-admin.service.js';
import * as superAdminController from '../../src/modules/super-admin/super-admin.controller.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('superAdminController.listTenants', () => {
  it('returns paginated tenants with query params', async () => {
    const result = { data: [{ id: 'test' }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } };
    vi.mocked(superAdminService.listTenants).mockResolvedValue(result);
    const req = { query: { page: '1', limit: '20', active: 'true', search: 'clinic' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await superAdminController.listTenants(req, res, next);
    expect(superAdminService.listTenants).toHaveBeenCalledWith(1, 20, { active: true, search: 'clinic' });
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('uses defaults when no query params', async () => {
    vi.mocked(superAdminService.listTenants).mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    const req = { query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await superAdminController.listTenants(req, res, next);
    expect(superAdminService.listTenants).toHaveBeenCalledWith(1, 20, { active: undefined, search: undefined });
  });
});

describe('superAdminController.getTenantDetail', () => {
  it('returns tenant detail', async () => {
    const result = { tenant: { id: 'test', name: 'Test' }, stats: {}, subscription: null };
    vi.mocked(superAdminService.getTenantDetail).mockResolvedValue(result);
    const req = { params: { id: 'test' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await superAdminController.getTenantDetail(req, res, next);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('superAdminController.updateTenant', () => {
  it('updates and returns tenant', async () => {
    vi.mocked(superAdminService.updateTenant).mockResolvedValue({ id: 'test', name: 'Updated' });
    const req = { params: { id: 'test' }, body: { name: 'Updated' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await superAdminController.updateTenant(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ id: 'test', name: 'Updated' });
  });
});

describe('superAdminController.deleteTenant', () => {
  it('deletes with confirmation', async () => {
    const req = { params: { id: 'test' }, body: { confirm: true } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await superAdminController.deleteTenant(req, res, next);
    expect(superAdminService.deleteTenant).toHaveBeenCalledWith('test');
    expect(res.json).toHaveBeenCalledWith({ message: 'Tenant deleted' });
  });

  it('returns 400 without confirmation', async () => {
    const req = { params: { id: 'test' }, body: {} };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await superAdminController.deleteTenant(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(superAdminService.deleteTenant).not.toHaveBeenCalled();
  });
});

describe('superAdminController.getGlobalStats', () => {
  it('returns stats', async () => {
    vi.mocked(superAdminService.getGlobalStats).mockResolvedValue({ total_tenants: '5' });
    const req = {};
    const res = { json: vi.fn() };
    const next = vi.fn();

    await superAdminController.getGlobalStats(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ total_tenants: '5' });
  });
});

describe('superAdminController.adminCreateTenant', () => {
  it('creates tenant and returns 201', async () => {
    vi.mocked(superAdminService.adminCreateTenant).mockResolvedValue({ tenantId: 'new' });
    const req = { body: { id: 'new', name: 'New' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await superAdminController.adminCreateTenant(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ tenantId: 'new' });
  });
});
