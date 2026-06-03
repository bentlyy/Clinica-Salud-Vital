import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/super-admin/super-admin.service.js', () => ({
  listTenants: vi.fn(),
  getTenantDetail: vi.fn(),
  updateTenant: vi.fn(),
  deleteTenant: vi.fn(),
  getGlobalStats: vi.fn(),
  getGlobalDashboard: vi.fn(),
  getPlanDistribution: vi.fn(),
  getTopTenants: vi.fn(),
  getRevenueAnalytics: vi.fn(),
  getGrowthMetrics: vi.fn(),
  adminCreateTenant: vi.fn(),
}));

import * as superAdminService from '../../src/modules/super-admin/super-admin.service.js';
import * as superAdminController from '../../src/modules/super-admin/super-admin.controller.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

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

describe('superAdminController.getDashboardData', () => {
  it('returns global dashboard with plan distribution', async () => {
    vi.mocked(superAdminService.getGlobalDashboard).mockResolvedValue({ total_tenants: 10, mrr: '4000' });
    vi.mocked(superAdminService.getPlanDistribution).mockResolvedValue([{ plan: 'Pro', code: 'pro', count: '5' }]);
    const req = {};
    const res = { json: vi.fn() };
    const next = vi.fn();

    await superAdminController.getDashboardData(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({
      data: { total_tenants: 10, mrr: '4000', planDistribution: [{ plan: 'Pro', code: 'pro', count: '5' }] },
    });
  });
});

describe('superAdminController.getTopTenantsData', () => {
  it('returns top tenants with default params', async () => {
    vi.mocked(superAdminService.getTopTenants).mockResolvedValue([{ id: 't1', name: 'Clinic A' }]);
    const req = { query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await superAdminController.getTopTenantsData(req, res, next);
    await flush();
    expect(superAdminService.getTopTenants).toHaveBeenCalledWith(10, 'bookings');
    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 't1', name: 'Clinic A' }] });
  });

  it('accepts custom limit and metric', async () => {
    vi.mocked(superAdminService.getTopTenants).mockResolvedValue([]);
    const req = { query: { limit: '5', metric: 'revenue' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await superAdminController.getTopTenantsData(req, res, next);
    await flush();
    expect(superAdminService.getTopTenants).toHaveBeenCalledWith(5, 'revenue');
  });

  it('falls back to bookings for invalid metric', async () => {
    vi.mocked(superAdminService.getTopTenants).mockResolvedValue([]);
    const req = { query: { metric: 'invalid' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await superAdminController.getTopTenantsData(req, res, next);
    await flush();
    expect(superAdminService.getTopTenants).toHaveBeenCalledWith(10, 'bookings');
  });
});

describe('superAdminController.getRevenueData', () => {
  it('returns revenue analytics', async () => {
    vi.mocked(superAdminService.getRevenueAnalytics).mockResolvedValue([{ month: '2026-01', revenue: '2500' }]);
    const req = { query: { months: '6' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await superAdminController.getRevenueData(req, res, next);
    await flush();
    expect(superAdminService.getRevenueAnalytics).toHaveBeenCalledWith(6);
    expect(res.json).toHaveBeenCalledWith({ data: [{ month: '2026-01', revenue: '2500' }] });
  });
});

describe('superAdminController.getGrowthData', () => {
  it('returns growth metrics', async () => {
    vi.mocked(superAdminService.getGrowthMetrics).mockResolvedValue([{ month: '2026-01', new_tenants: 2 }]);
    const req = { query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await superAdminController.getGrowthData(req, res, next);
    await flush();
    expect(superAdminService.getGrowthMetrics).toHaveBeenCalledWith(12);
    expect(res.json).toHaveBeenCalledWith({ data: [{ month: '2026-01', new_tenants: 2 }] });
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
