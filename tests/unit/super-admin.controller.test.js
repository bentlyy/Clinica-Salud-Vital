import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSuperAdminService = vi.hoisted(() => ({
  listTenants: vi.fn(),
  getTenantDetail: vi.fn(),
  updateTenant: vi.fn(),
  deleteTenant: vi.fn(),
  getGlobalStats: vi.fn(),
  adminCreateTenant: vi.fn(),
  getGlobalDashboard: vi.fn(),
  getPlanDistribution: vi.fn(),
  getTopTenants: vi.fn(),
  getRevenueAnalytics: vi.fn(),
  getGrowthMetrics: vi.fn(),
  getTenantGrowthMetrics: vi.fn(),
  listUsers: vi.fn(),
  setUserActive: vi.fn(),
  getTenantHealthScores: vi.fn(),
  getTenantHealthDetail: vi.fn(),
  getOperationMetrics: vi.fn(),
  getChurnMetrics: vi.fn(),
  getComparisonTable: vi.fn(),
  getOccupancyMetrics: vi.fn(),
  getActivityMetrics: vi.fn(),
  getAlerts: vi.fn(),
}));

vi.mock('../../src/modules/super-admin/super-admin.service.js', () => mockSuperAdminService);

vi.mock('../../src/middlewares/asyncHandler.middleware.js', () => ({
  asyncHandler: (fn) => fn,
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockBadRequestError = vi.hoisted(() => {
  return class BadRequestError extends Error {
    constructor(msg) { super(msg); this.name = 'BadRequestError'; }
  };
});

vi.mock('../../src/utils/errors.js', () => ({
  BadRequestError: mockBadRequestError,
}));

import * as superAdminController from '../../src/modules/super-admin/super-admin.controller.js';

beforeEach(() => {
  vi.clearAllMocks();
});

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockReq = (overrides = {}) => ({
  query: {},
  params: {},
  body: {},
  user: { id: 1 },
  ...overrides,
});

describe('superAdminController.listTenants', () => {
  it('returns paginated tenants with defaults', async () => {
    const tenants = { data: [{ id: 't1' }], pagination: { total: 1 } };
    mockSuperAdminService.listTenants.mockResolvedValue(tenants);
    const req = mockReq();
    const res = mockRes();

    await superAdminController.listTenants(req, res);

    expect(mockSuperAdminService.listTenants).toHaveBeenCalledWith(1, 20, { active: undefined, search: undefined });
    expect(res.json).toHaveBeenCalledWith(tenants);
  });

  it('parses query params correctly', async () => {
    mockSuperAdminService.listTenants.mockResolvedValue({ data: [], pagination: { total: 0 } });
    const req = mockReq({ query: { page: '2', limit: '10', active: 'true', search: 'clinic' } });
    const res = mockRes();

    await superAdminController.listTenants(req, res);

    expect(mockSuperAdminService.listTenants).toHaveBeenCalledWith(2, 10, { active: true, search: 'clinic' });
  });
});

describe('superAdminController.getTenantDetail', () => {
  it('returns tenant detail', async () => {
    const detail = { tenant: { id: 't1' }, stats: {}, subscription: null };
    mockSuperAdminService.getTenantDetail.mockResolvedValue(detail);
    const req = mockReq({ params: { id: 't1' } });
    const res = mockRes();

    await superAdminController.getTenantDetail(req, res);

    expect(res.json).toHaveBeenCalledWith(detail);
  });
});

describe('superAdminController.updateTenant', () => {
  it('updates tenant and returns result', async () => {
    const updated = { id: 't1', name: 'Updated' };
    mockSuperAdminService.updateTenant.mockResolvedValue(updated);
    const req = mockReq({ params: { id: 't1' }, body: { name: 'Updated' } });
    const res = mockRes();

    await superAdminController.updateTenant(req, res);

    expect(mockSuperAdminService.updateTenant).toHaveBeenCalledWith('t1', { name: 'Updated' });
    expect(res.json).toHaveBeenCalledWith(updated);
  });
});

describe('superAdminController.deleteTenant', () => {
  it('deletes tenant with confirm=true', async () => {
    mockSuperAdminService.deleteTenant.mockResolvedValue();
    const req = mockReq({ params: { id: 't1' }, body: { confirm: true } });
    const res = mockRes();

    await superAdminController.deleteTenant(req, res);

    expect(mockSuperAdminService.deleteTenant).toHaveBeenCalledWith('t1', 1);
    expect(res.json).toHaveBeenCalledWith({ message: 'Tenant soft-deleted. Data retained for compliance.' });
  });

  it('throws when confirm is not true', async () => {
    const req = mockReq({ params: { id: 't1' }, body: {} });

    await expect(superAdminController.deleteTenant(req, {})).rejects.toThrow('Must set confirm=true');
  });
});

describe('superAdminController.getGlobalStats', () => {
  it('returns global stats', async () => {
    const stats = { total_tenants: 10, active_tenants: 8 };
    mockSuperAdminService.getGlobalStats.mockResolvedValue(stats);
    const res = mockRes();

    await superAdminController.getGlobalStats({}, res);

    expect(res.json).toHaveBeenCalledWith(stats);
  });
});

describe('superAdminController.adminCreateTenant', () => {
  it('creates tenant and returns 201', async () => {
    const result = { tenantId: 'new-tenant', message: 'Created' };
    mockSuperAdminService.adminCreateTenant.mockResolvedValue(result);
    const req = mockReq({ body: { id: 'new-tenant', name: 'Test' } });
    const res = mockRes();

    await superAdminController.adminCreateTenant(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('superAdminController.getDashboardData', () => {
  it('returns dashboard with plan distribution', async () => {
    mockSuperAdminService.getGlobalDashboard.mockResolvedValue({ total_tenants: 10 });
    mockSuperAdminService.getPlanDistribution.mockResolvedValue([{ plan: 'Pro', count: 5 }]);
    const res = mockRes();

    await superAdminController.getDashboardData({}, res);

    expect(res.json).toHaveBeenCalledWith({
      data: { total_tenants: 10, planDistribution: [{ plan: 'Pro', count: 5 }] },
    });
  });
});

describe('superAdminController.getTopTenantsData', () => {
  it('returns top tenants by default metric', async () => {
    mockSuperAdminService.getTopTenants.mockResolvedValue([{ id: 't1', metric_value: 100 }]);
    const req = mockReq({ query: {} });
    const res = mockRes();

    await superAdminController.getTopTenantsData(req, res);

    expect(mockSuperAdminService.getTopTenants).toHaveBeenCalledWith(10, 'bookings');
    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 't1', metric_value: 100 }] });
  });

  it('uses provided metric and limit', async () => {
    mockSuperAdminService.getTopTenants.mockResolvedValue([]);
    const req = mockReq({ query: { limit: '5', metric: 'revenue' } });
    const res = mockRes();

    await superAdminController.getTopTenantsData(req, res);

    expect(mockSuperAdminService.getTopTenants).toHaveBeenCalledWith(5, 'revenue');
  });

  it('falls back to bookings for invalid metric', async () => {
    mockSuperAdminService.getTopTenants.mockResolvedValue([]);
    const req = mockReq({ query: { metric: 'invalid' } });
    const res = mockRes();

    await superAdminController.getTopTenantsData(req, res);

    expect(mockSuperAdminService.getTopTenants).toHaveBeenCalledWith(10, 'bookings');
  });
});

describe('superAdminController.getRevenueData', () => {
  it('returns revenue analytics', async () => {
    mockSuperAdminService.getRevenueAnalytics.mockResolvedValue([{ month: '2026-01', revenue: 1000 }]);
    const req = mockReq({ query: { months: '6' } });
    const res = mockRes();

    await superAdminController.getRevenueData(req, res);

    expect(mockSuperAdminService.getRevenueAnalytics).toHaveBeenCalledWith(6);
    expect(res.json).toHaveBeenCalledWith({ data: [{ month: '2026-01', revenue: 1000 }] });
  });
});

describe('superAdminController.getGrowthData', () => {
  it('returns growth metrics', async () => {
    mockSuperAdminService.getGrowthMetrics.mockResolvedValue([{ month: '2026-01', new_tenants: 2 }]);
    const req = mockReq({ query: { months: '3' } });
    const res = mockRes();

    await superAdminController.getGrowthData(req, res);

    expect(mockSuperAdminService.getGrowthMetrics).toHaveBeenCalledWith(3);
    expect(res.json).toHaveBeenCalledWith({ data: [{ month: '2026-01', new_tenants: 2 }] });
  });
});

describe('superAdminController.getTenantGrowthData', () => {
  it('returns tenant-specific growth', async () => {
    mockSuperAdminService.getTenantGrowthMetrics.mockResolvedValue([{ month: '2026-01', new_users: 5 }]);
    const req = mockReq({ params: { tenantId: 't1' }, query: { months: '6' } });
    const res = mockRes();

    await superAdminController.getTenantGrowthData(req, res);

    expect(mockSuperAdminService.getTenantGrowthMetrics).toHaveBeenCalledWith('t1', 6);
    expect(res.json).toHaveBeenCalledWith({ data: [{ month: '2026-01', new_users: 5 }] });
  });
});

describe('superAdminController.listUsers', () => {
  it('returns paginated users with defaults', async () => {
    const users = { data: [{ id: 1, email: 'a@b.com' }], pagination: { total: 1 } };
    mockSuperAdminService.listUsers.mockResolvedValue(users);
    const req = mockReq();
    const res = mockRes();

    await superAdminController.listUsers(req, res);

    expect(mockSuperAdminService.listUsers).toHaveBeenCalledWith(1, 50, { tenantId: undefined, role: undefined, search: undefined });
    expect(res.json).toHaveBeenCalledWith(users);
  });

  it('parses filter params', async () => {
    mockSuperAdminService.listUsers.mockResolvedValue({ data: [], pagination: { total: 0 } });
    const req = mockReq({ query: { page: '1', limit: '10', tenant_id: 't1', role: 'doctor', search: 'john' } });
    const res = mockRes();

    await superAdminController.listUsers(req, res);

    expect(mockSuperAdminService.listUsers).toHaveBeenCalledWith(1, 10, { tenantId: 't1', role: 'doctor', search: 'john' });
  });
});

describe('superAdminController.toggleUserActive', () => {
  it('activates user', async () => {
    mockSuperAdminService.setUserActive.mockResolvedValue({ id: 1, active: true });
    const req = mockReq({ params: { userId: '5' }, body: { active: true }, tenant_id: 't1' });
    const res = mockRes();

    await superAdminController.toggleUserActive(req, res);

    expect(mockSuperAdminService.setUserActive).toHaveBeenCalledWith(5, true, 't1');
    expect(res.json).toHaveBeenCalledWith({ id: 1, active: true });
  });

  it('defaults active to true when not provided', async () => {
    mockSuperAdminService.setUserActive.mockResolvedValue({ id: 1, active: true });
    const req = mockReq({ params: { userId: '5' }, body: {}, tenant_id: 't1' });
    const res = mockRes();

    await superAdminController.toggleUserActive(req, res);

    expect(mockSuperAdminService.setUserActive).toHaveBeenCalledWith(5, true, 't1');
  });
});

describe('superAdminController.getHealthScores', () => {
  it('returns health scores', async () => {
    mockSuperAdminService.getTenantHealthScores.mockResolvedValue([{ id: 't1', health_score: 85 }]);
    const res = mockRes();

    await superAdminController.getHealthScores({}, res);

    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 't1', health_score: 85 }] });
  });
});

describe('superAdminController.getHealthScoreDetail', () => {
  it('returns health detail for tenant', async () => {
    mockSuperAdminService.getTenantHealthDetail.mockResolvedValue({ id: 't1', health_score: 75 });
    const req = mockReq({ params: { tenantId: 't1' } });
    const res = mockRes();

    await superAdminController.getHealthScoreDetail(req, res);

    expect(res.json).toHaveBeenCalledWith({ data: { id: 't1', health_score: 75 } });
  });
});

describe('superAdminController.getOperations', () => {
  it('returns operation metrics', async () => {
    mockSuperAdminService.getOperationMetrics.mockResolvedValue({ specialties: [], total_bookings_period: 100 });
    const req = mockReq({ query: { months: '3' } });
    const res = mockRes();

    await superAdminController.getOperations(req, res);

    expect(mockSuperAdminService.getOperationMetrics).toHaveBeenCalledWith(3);
    expect(res.json).toHaveBeenCalledWith({ data: { specialties: [], total_bookings_period: 100 } });
  });
});

describe('superAdminController.getChurn', () => {
  it('returns churn metrics', async () => {
    mockSuperAdminService.getChurnMetrics.mockResolvedValue({ churn_rate: 5.0, mrr: 5000 });
    const req = mockReq({ query: { months: '6' } });
    const res = mockRes();

    await superAdminController.getChurn(req, res);

    expect(mockSuperAdminService.getChurnMetrics).toHaveBeenCalledWith(6);
    expect(res.json).toHaveBeenCalledWith({ data: { churn_rate: 5.0, mrr: 5000 } });
  });
});

describe('superAdminController.getComparison', () => {
  it('returns comparison table', async () => {
    mockSuperAdminService.getComparisonTable.mockResolvedValue([{ id: 't1', health_score: 80 }]);
    const res = mockRes();

    await superAdminController.getComparison({}, res);

    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 't1', health_score: 80 }] });
  });
});

describe('superAdminController.getOccupancy', () => {
  it('returns occupancy metrics', async () => {
    mockSuperAdminService.getOccupancyMetrics.mockResolvedValue([{ id: 't1', occupancy_pct: 75.5 }]);
    const res = mockRes();

    await superAdminController.getOccupancy({}, res);

    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 't1', occupancy_pct: 75.5 }] });
  });
});

describe('superAdminController.getActivity', () => {
  it('returns activity metrics', async () => {
    mockSuperAdminService.getActivityMetrics.mockResolvedValue([{ id: 't1', bookings_7d: 0 }]);
    const res = mockRes();

    await superAdminController.getActivity({}, res);

    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 't1', bookings_7d: 0 }] });
  });
});

describe('superAdminController.getAlerts', () => {
  it('returns alerts', async () => {
    mockSuperAdminService.getAlerts.mockResolvedValue([{ type: 'inactivity', tenant_id: 't1' }]);
    const res = mockRes();

    await superAdminController.getAlerts({}, res);

    expect(res.json).toHaveBeenCalledWith({ data: [{ type: 'inactivity', tenant_id: 't1' }] });
  });
});
