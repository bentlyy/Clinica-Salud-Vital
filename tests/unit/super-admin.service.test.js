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
  it('deletes tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'test' }] });
    await superAdminService.deleteTenant('test');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM tenants'), ['test']);
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
