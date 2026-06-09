import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockClient, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockClient: { query: vi.fn(), release: vi.fn() },
  mockConnect: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: mockConnect,
    on: vi.fn(),
  },
  logPhiAccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn().mockResolvedValue('$2b$12$hash') },
  hash: vi.fn().mockResolvedValue('$2b$12$hash'),
}));

import * as superAdminService from '../../src/modules/super-admin/super-admin.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
});

describe('superAdminService.listTenants', () => {
  it('returns paginated tenants', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '1' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'test', name: 'Test Clinic' }] });
    const result = await superAdminService.listTenants(1, 20);
    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.page).toBe(1);
  });

  it('applies active filter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await superAdminService.listTenants(1, 20, { active: true });
    expect(result.data).toEqual([]);
  });

  it('applies search filter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await superAdminService.listTenants(1, 20, { search: 'clinic' });
    expect(result.data).toEqual([]);
  });
});

describe('superAdminService.getTenantDetail', () => {
  it('returns tenant with stats and subscription', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'test', name: 'Test' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ patient_count: '10', doctor_count: '2', booking_count: '50', clinical_record_count: '30', invoice_count: '20', lab_request_count: '5' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, plan_name: 'Pro', plan_code: 'pro' }] });
    const result = await superAdminService.getTenantDetail('test');
    expect(result.tenant.id).toBe('test');
    expect(result.stats.patient_count).toBe('10');
    expect(result.subscription.plan_code).toBe('pro');
  });

  it('throws when tenant not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(superAdminService.getTenantDetail('nonexistent')).rejects.toThrow('Tenant not found');
  });

  it('handles empty stats result', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'test', name: 'Test' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, plan_name: 'Pro', plan_code: 'pro' }] });
    const result = await superAdminService.getTenantDetail('test');
    expect(result.stats).toEqual({});
  });
});

describe('superAdminService.updateTenant', () => {
  it('updates allowed fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'test', name: 'Updated', locale: 'en' }] });
    const result = await superAdminService.updateTenant('test', { name: 'Updated', locale: 'en' });
    expect(result.name).toBe('Updated');
  });

  it('skips undefined values in updateTenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'test', name: 'Skipped', locale: 'es' }] });
    const result = await superAdminService.updateTenant('test', { name: 'Skipped', locale: undefined });
    expect(result.name).toBe('Skipped');
  });

  it('throws for unknown fields', async () => {
    await expect(superAdminService.updateTenant('test', { unknown: 'value' })).rejects.toThrow('Unknown field');
  });

  it('throws when no fields provided', async () => {
    await expect(superAdminService.updateTenant('test', {})).rejects.toThrow('No fields to update');
  });

  it('throws when tenant not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(superAdminService.updateTenant('nonexistent', { name: 'Test' })).rejects.toThrow('Tenant not found');
  });
});

describe('superAdminService.deleteTenant', () => {
  it('deletes tenant (soft-delete)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'test' }] });
    mockQuery.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce(undefined);
    await superAdminService.deleteTenant('test', 1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE tenants SET active = false, deleted_at'),
      expect.arrayContaining(['test'])
    );
  });

  it('throws if tenant not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(superAdminService.deleteTenant('nonexistent')).rejects.toThrow('Tenant not found');
  });
});

describe('superAdminService.getGlobalStats', () => {
  it('returns global stats', async () => {
    const stats = { total_tenants: '5', active_tenants: '3', total_users: '100', total_doctors: '15', total_bookings: '500', total_revenue: '10000' };
    mockQuery.mockResolvedValueOnce({ rows: [stats] });
    const result = await superAdminService.getGlobalStats();
    expect(result.total_tenants).toBe('5');
    expect(result.total_revenue).toBe('10000');
  });
});

describe('superAdminService.getGlobalDashboard', () => {
  it('returns comprehensive global dashboard data', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{
      total_tenants: 10, active_tenants: 8, inactive_tenants: 2,
      total_users: 500, admin_users: 10, patient_users: 400,
      total_doctors: 50, total_bookings: 3000,
      confirmed_bookings: 2000, cancelled_bookings: 500,
      total_revenue: '50000', mrr: '4000',
      active_subscriptions: 8, canceled_subscriptions: 2, trialing_subscriptions: 1,
    }]});
    const result = await superAdminService.getGlobalDashboard();
    expect(result.total_tenants).toBe(10);
    expect(result.active_subscriptions).toBe(8);
    expect(result.mrr).toBe('4000');
  });
});

describe('superAdminService.getPlanDistribution', () => {
  it('returns plan distribution', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [
      { plan: 'Pro', code: 'pro', count: '5' },
      { plan: 'Free', code: 'free', count: '3' },
    ]});
    const result = await superAdminService.getPlanDistribution();
    expect(result).toHaveLength(2);
    expect(result[0].plan).toBe('Pro');
  });
});

describe('superAdminService.getTopTenants', () => {
  it('returns top tenants by default metric', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [
      { id: 'tenant-1', name: 'Clinic A', metric_value: 100, total_bookings: 100, total_users: 20, total_doctors: 5 },
    ]});
    const result = await superAdminService.getTopTenants(5);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Clinic A');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('LIMIT $1'), [5]);
  });

  it('accepts different metric', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await superAdminService.getTopTenants(10, 'revenue');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('subscription_invoices'), [10]);
  });
});

describe('superAdminService.getRevenueAnalytics', () => {
  it('returns monthly revenue breakdown', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [
      { month: '2026-01', invoices: 5, revenue: '2500' },
      { month: '2026-02', invoices: 7, revenue: '3500' },
    ]});
    const result = await superAdminService.getRevenueAnalytics(6);
    expect(result).toHaveLength(2);
    expect(result[0].revenue).toBe('2500');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INTERVAL'), [6]);
  });
});

describe('superAdminService.getGrowthMetrics', () => {
  it('returns new tenants/users/bookings per month', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [
      { month: '2026-01', new_tenants: 2, new_users: 50, new_bookings: 300 },
      { month: '2026-02', new_tenants: 1, new_users: 30, new_bookings: 250 },
    ]});
    const result = await superAdminService.getGrowthMetrics(12);
    expect(result).toHaveLength(2);
    expect(result[0].new_tenants).toBe(2);
  });
});

describe('superAdminService.adminCreateTenant', () => {
  it('creates tenant with admin user', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await superAdminService.adminCreateTenant({
      id: 'new-tenant',
      name: 'New Tenant',
      domain: 'new-tenant',
      adminEmail: 'admin@new.com',
      adminPassword: 'TestPass123!',
    });

    expect(result.tenantId).toBe('new-tenant');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('creates subscription when planCode provided', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('WHERE code =')) return Promise.resolve({ rows: [{ id: 1, code: 'pro' }] });
      return Promise.resolve({ rows: [] });
    });

    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await superAdminService.adminCreateTenant({
      id: 'new-tenant',
      name: 'New Tenant',
      domain: 'new-tenant',
      adminEmail: 'admin@new.com',
      adminPassword: 'TestPass123!',
      planCode: 'pro',
    });

    expect(result.tenantId).toBe('new-tenant');
  });

  it('rolls back on error', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('INSERT INTO tenants')) return Promise.reject(new Error('DB error'));
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(superAdminService.adminCreateTenant({
      id: 'fail',
      name: 'Fail',
      domain: 'fail',
      adminEmail: 'admin@fail.com',
      adminPassword: 'TestPass123!',
    })).rejects.toThrow('DB error');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});
