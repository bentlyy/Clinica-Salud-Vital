import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockClient, mockConnect, mockLogger, mockLoadFromDB } = vi.hoisted(() => {
  const client = { query: vi.fn(), release: vi.fn() };
  return {
    mockQuery: vi.fn(),
    mockClient: client,
    mockConnect: vi.fn(() => client),
    mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    mockLoadFromDB: vi.fn(),
  };
});

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery, connect: mockConnect, on: vi.fn() },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: mockLogger,
}));

vi.mock('../../src/shared/multi-tenant.service.js', () => ({
  tenantService: { loadFromDB: mockLoadFromDB },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
});

import {
  listTenants, getTenantDetail, updateTenant, deleteTenant,
  listUsers, setUserActive, getGlobalStats, getGlobalDashboard,
  getPlanDistribution, getTopTenants, getRevenueAnalytics,
  getGrowthMetrics, getTenantHealthScores, getTenantHealthDetail,
  getOperationMetrics, getChurnMetrics, getComparisonTable,
  getOccupancyMetrics, getActivityMetrics, getAlerts,
  adminCreateTenant,
} from '../../src/modules/super-admin/super-admin.service.js';

describe('listTenants', () => {
  it('returns paginated tenants', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 3 }] })
      .mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Test' }, { id: 't2', name: 'Test 2' }] });

    const result = await listTenants(1, 2);
    expect(result.pagination.total).toBe(3);
    expect(result.data).toHaveLength(2);
    expect(result.pagination.totalPages).toBe(2);
  });

  it('filters by active status', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Active Tenant' }] });

    await listTenants(1, 20, { active: true });
    expect(mockQuery.mock.calls[0][1]).toContain(true);
  });

  it('searches by name/id/domain', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 't1' }] });

    await listTenants(1, 20, { search: 'clinic' });
    const params = mockQuery.mock.calls[0][1];
    expect(params.some(p => String(p).includes('clinic'))).toBe(true);
  });

  it('returns empty result when no tenants', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await listTenants();
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });
});

describe('getTenantDetail', () => {
  it('returns tenant with stats and subscription', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Test' }] })
      .mockResolvedValueOnce({ rows: [{ total_patients: 10, total_doctors: 2 }] })
      .mockResolvedValueOnce({ rows: [{ plan_name: 'Pro', status: 'active' }] });

    const result = await getTenantDetail('t1');
    expect(result.id).toBe('t1');
    expect(result.name).toBe('Test');
    expect(result.total_patients).toBe(10);
    expect(result.total_doctors).toBe(2);
    expect(result.plan_name).toBe('Pro');
  });

  it('throws NotFoundError for unknown tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(getTenantDetail('nonexistent')).rejects.toThrow('Tenant not found');
  });

  it('returns null subscription when none active', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Test' }] })
      .mockResolvedValueOnce({ rows: [{ total_patients: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await getTenantDetail('t1');
    expect(result.plan).toBe('free');
  });
});

describe('updateTenant', () => {
  it('updates allowed fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Updated', updated_at: new Date() }] });

    const result = await updateTenant('t1', { name: 'Updated', locale: 'en' });
    expect(result.id).toBe('t1');
    expect(result.name).toBe('Updated');
    expect(mockLoadFromDB).toHaveBeenCalled();
  });

  it('throws BadRequestError for unknown field', async () => {
    await expect(updateTenant('t1', { unknown_field: 'test' })).rejects.toThrow('Unknown field');
  });

  it('throws BadRequestError when no fields provided', async () => {
    await expect(updateTenant('t1', {})).rejects.toThrow('No fields to update');
  });

  it('throws NotFoundError when tenant does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(updateTenant('t1', { name: 'Test' })).rejects.toThrow('Tenant not found');
  });
});

describe('deleteTenant', () => {
  it('soft-deletes tenant and revokes tokens', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(deleteTenant('t1', 1)).resolves.not.toThrow();
    expect(mockQuery.mock.calls[0][1]).toContain('t1');
    expect(mockQuery.mock.calls[1][0]).toContain('refresh_tokens');
    expect(mockQuery.mock.calls[2][0]).toContain('users');
  });

  it('throws NotFoundError if tenant already deleted', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(deleteTenant('t1')).rejects.toThrow('Tenant not found');
  });
});

describe('listUsers', () => {
  it('returns paginated users', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 5 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, email: 'a@b.com', name: 'User' }] });

    const result = await listUsers(1, 10);
    expect(result.pagination.total).toBe(5);
    expect(result.data).toHaveLength(1);
  });

  it('filters by tenantId', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await listUsers(1, 10, { tenantId: 't1' });
    expect(mockQuery.mock.calls[0][1]).toContain('t1');
  });

  it('filters by role', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await listUsers(1, 10, { role: 'admin' });
    expect(mockQuery.mock.calls[0][1]).toContain('admin');
  });
});

describe('setUserActive', () => {
  it('activates user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, active: true }] });
    const result = await setUserActive(1, true);
    expect(result.active).toBe(true);
  });

  it('throws NotFoundError for unknown user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(setUserActive(999, false)).rejects.toThrow('User not found');
  });
});

describe('getGlobalStats', () => {
  it('returns aggregated stats', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ total_tenants: 10, active_tenants: 8, total_users: 100, total_doctors: 20, total_bookings: 500, total_revenue: 10000 }],
    });

    const stats = await getGlobalStats();
    expect(stats.total_tenants).toBe(10);
    expect(stats.active_tenants).toBe(8);
    expect(stats.total_revenue).toBe(10000);
  });
});

describe('getGlobalDashboard', () => {
  it('returns dashboard metrics', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ total_tenants: 10, active_tenants: 8, mrr: 5000, churn_rate_30d: 2.5 }],
    });

    const dashboard = await getGlobalDashboard();
    expect(dashboard.total_tenants).toBe(10);
    expect(dashboard.mrr).toBe(5000);
  });
});

describe('getPlanDistribution', () => {
  it('returns plan distribution', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan: 'Pro', code: 'pro', count: '5' }] });
    const dist = await getPlanDistribution();
    expect(dist).toHaveLength(1);
    expect(dist[0].plan).toBe('Pro');
  });
});

describe('getTopTenants', () => {
  it('returns top tenants by bookings default', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Top', metric_value: 100 }] });
    const result = await getTopTenants(5);
    expect(result).toHaveLength(1);
    expect(mockQuery.mock.calls[0][1]).toEqual([5]);
  });

  it('accepts different metrics', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await getTopTenants(3, 'revenue');
    expect(mockQuery.mock.calls[0][0]).toContain('SUM(si.amount)');
  });
});

describe('getRevenueAnalytics', () => {
  it('returns revenue by month', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ month: '2026-01', invoices: 10, revenue: 1000 }] });
    const result = await getRevenueAnalytics(12);
    expect(result[0].month).toBe('2026-01');
  });
});

describe('getGrowthMetrics', () => {
  it('returns growth data', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ month: '2026-01', new_tenants: 2, new_users: 10, new_bookings: 50 }] });
    const result = await getGrowthMetrics(12);
    expect(result).toHaveLength(1);
  });
});

describe('getTenantHealthScores', () => {
  it('returns health scores for all tenants', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 't1', name: 'Test', health_total: 85,
        score_activity: 20, score_trend: 18, score_patients: 20,
        score_cancellation: 15, score_modules: 12,
        bookings_30d: 10, bookings_prev_30d: 8, last_booking: new Date(),
        unique_patients_30d: 5, cancellations_30d: 1, modules_used: 3,
      }],
    });

    const scores = await getTenantHealthScores();
    expect(scores).toHaveLength(1);
    expect(scores[0].health_score).toBe(85);
  });
});

describe('getTenantHealthDetail', () => {
  it('returns health score for specific tenant', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 't1', name: 'Test', health_total: 75, score_activity: 15 }],
    });

    const detail = await getTenantHealthDetail('t1');
    expect(detail.id).toBe('t1');
  });

  it('throws NotFoundError for unknown tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(getTenantHealthDetail('nonexistent')).rejects.toThrow('Tenant not found');
  });
});

describe('getOperationMetrics', () => {
  it('returns operational metrics', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ name: 'Cardiology', total: 50 }] })
      .mockResolvedValueOnce({ rows: [{ cancellation_rate: 5.0, total_cancelled: 10, total_bookings_period: 200 }] })
      .mockResolvedValueOnce({ rows: [{ no_show_rate: 3.5 }] })
      .mockResolvedValueOnce({ rows: [{ avg_lead_days: 4.5 }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Dr. X', total_bookings: 30, rank: 1 }] })
      .mockResolvedValueOnce({ rows: [{ day_of_week: 1, hour: 10, bookings: 15 }] });

    const metrics = await getOperationMetrics(6);
    expect(metrics.specialties).toHaveLength(1);
    expect(metrics.total_bookings_period).toBe(200);
    expect(metrics.top_doctors).toHaveLength(1);
    expect(metrics.hourly_demand).toHaveLength(1);
  });
});

describe('getChurnMetrics', () => {
  it('returns churn calculations', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ month: '2026-01', canceled: 2, new_active: 5, total_active: 50 }] })
      .mockResolvedValueOnce({ rows: [{ mrr: 5000 }] });

    const metrics = await getChurnMetrics(12);
    expect(metrics.mrr).toBe(5000);
    expect(typeof metrics.churn_rate).toBe('number');
    expect(typeof metrics.retention_rate).toBe('number');
  });
});

describe('getComparisonTable', () => {
  it('returns tenant comparison with health scores', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Test', total_bookings: 100 }] })
      .mockResolvedValueOnce({ rows: [{
        id: 't1', name: 'Test', active: true,
        score_activity: 20, score_trend: 20, score_patients: 20,
        score_cancellation: 20, score_modules: 0,
      }] });

    const table = await getComparisonTable();
    expect(table).toHaveLength(1);
    expect(table[0].health_score).toBe(80);
  });
});

describe('getOccupancyMetrics', () => {
  it('returns occupancy data', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Test', occupancy_pct: 75.5 }] });
    const metrics = await getOccupancyMetrics();
    expect(metrics[0].occupancy_pct).toBe(75.5);
  });
});

describe('getActivityMetrics', () => {
  it('returns activity data sorted by inactivity', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Inactive', bookings_7d: 0 }] });
    const metrics = await getActivityMetrics();
    expect(metrics).toHaveLength(1);
  });
});

describe('getAlerts', () => {
  it('generates alerts for inactive tenants', async () => {
    const longAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 't1', name: 'Inactive Tenant', active: true,
          health_total: 30, score_activity: 0, score_trend: 0,
          score_patients: 0, score_cancellation: 20, score_modules: 0,
          bookings_30d: 0, bookings_prev_30d: 5, last_booking: longAgo,
          unique_patients_30d: 0, cancellations_30d: 0, modules_used: 0,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 't1', name: 'Inactive Tenant', active: true, last_booking: longAgo, last_admin_activity: null, bookings_7d: 0, admin_active_30d: 0 }],
      });

    const alerts = await getAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.some(a => a.type === 'inactivity')).toBe(true);
  });

  it('returns empty array for healthy tenants', async () => {
    const recent = new Date();
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 't1', name: 'Healthy', active: true,
          health_total: 95, score_activity: 20, score_trend: 20,
          score_patients: 20, score_cancellation: 20, score_modules: 15,
          bookings_30d: 50, bookings_prev_30d: 40, last_booking: recent,
          unique_patients_30d: 15, cancellations_30d: 2, modules_used: 5,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 't1', name: 'Healthy', active: true, last_booking: recent, last_admin_activity: recent, bookings_7d: 15, admin_active_30d: 2 }],
      });

    const alerts = await getAlerts();
    expect(alerts).toEqual([]);
  });
});

describe('adminCreateTenant', () => {
  const validData = {
    id: 'new-tenant',
    name: 'New Clinic',
    domain: 'new.clinic.com',
    adminEmail: 'admin@new.clinic.com',
    adminPassword: 'SecurePass123!',
  };

  it('creates tenant with transaction', async () => {
    mockClient.query.mockResolvedValue({ rows: [] });
    mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Pro', code: 'pro' }] });

    const result = await adminCreateTenant(validData);
    expect(result.tenantId).toBe('new-tenant');
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('rolls back on error', async () => {
    mockClient.query.mockRejectedValueOnce(new Error('DB Error'));

    await expect(adminCreateTenant(validData)).rejects.toThrow('DB Error');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});
