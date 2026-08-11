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
  hash: vi.fn().mockResolvedValue('hashed-password'),
}));

vi.mock('../../src/shared/multi-tenant.service.js', () => ({
  tenantService: { loadFromDB: vi.fn().mockResolvedValue(undefined) },
}));

import * as saasService from '../../src/modules/saas/saas.service.js';
import { logger as mockLogger } from '../../src/utils/logger.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
});

const mockPlan = (overrides = {}) => ({
  id: 2,
  name: 'Pro Plan',
  code: 'pro',
  description: 'Pro plan',
  price_monthly: 100,
  price_yearly: 1000,
  max_doctors: 10,
  max_patients: 500,
  storage_gb: 50,
  features: { bookings: true },
  active: true,
  sort_order: 1,
  ...overrides,
});

describe('saasService.getPlans', () => {
  it('returns active plans ordered by sort_order', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockPlan(), mockPlan({ id: 1, code: 'basic' })] });

    const result = await saasService.getPlans();

    expect(result).toHaveLength(2);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM plans WHERE active = true'));
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ORDER BY sort_order ASC'));
  });
});

describe('saasService.getPlanByCode', () => {
  it('returns plan by code', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockPlan()] });

    const result = await saasService.getPlanByCode('pro');

    expect(result.code).toBe('pro');
    expect(mockQuery.mock.calls[0][1]).toEqual(['pro']);
  });

  it('throws Plan not found when no plan matches', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(saasService.getPlanByCode('nonexistent')).rejects.toThrow('Plan not found');
  });
});

describe('saasService.getPlanById', () => {
  it('returns plan by id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockPlan()] });

    const result = await saasService.getPlanById(2);

    expect(result.id).toBe(2);
    expect(mockQuery.mock.calls[0][1]).toEqual([2]);
  });

  it('throws Plan not found when no plan matches', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(saasService.getPlanById(999)).rejects.toThrow('Plan not found');
  });
});

describe('saasService.getTenantSubscription', () => {
  it('returns subscription with nested plan', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'active', plan: mockPlan() }] });

    const result = await saasService.getTenantSubscription('t1');

    expect(result).not.toBeNull();
    expect(result.plan.code).toBe('pro');
    expect(mockQuery.mock.calls[0][0]).toContain('status IN');
    expect(mockQuery.mock.calls[0][1]).toEqual(['t1']);
  });

  it('returns null when no subscription', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await saasService.getTenantSubscription('t1');

    expect(result).toBeNull();
  });
});

describe('saasService.getTenantPlan', () => {
  it('returns plan from active subscription', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, plan: mockPlan() }] });

    const result = await saasService.getTenantPlan('t1');

    expect(result.code).toBe('pro');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('falls back to free plan when no subscription', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [mockPlan({ id: 1, code: 'free', max_doctors: 1 })] });

    const result = await saasService.getTenantPlan('t1');

    expect(result.code).toBe('free');
  });

  it('returns default plan when free plan does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await saasService.getTenantPlan('t1');

    expect(result).toEqual(expect.objectContaining({ id: 0, code: 'free', max_doctors: 1 }));
  });
});

describe('saasService.createSubscription', () => {
  it('creates active subscription with paid invoice', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockPlan()] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id FROM subscriptions')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO subscriptions')) return Promise.resolve({ rows: [{ id: 5, status: 'active' }] });
      if (sql.includes('INSERT INTO subscription_invoices')) return Promise.resolve({});
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await saasService.createSubscription('t1', 'pro');

    expect(result.status).toBe('active');
    expect(result.plan.code).toBe('pro');
    const invoiceCall = mockClient.query.mock.calls.find(([sql]) => sql.includes('subscription_invoices'));
    expect(invoiceCall[1][3]).toBe('paid');
    expect(invoiceCall[1][6]).toEqual(expect.any(Date));
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('creates trialing subscription with pending invoice when trialDays provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockPlan()] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id FROM subscriptions')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO subscriptions')) return Promise.resolve({ rows: [{ id: 6, status: 'trialing' }] });
      if (sql.includes('INSERT INTO subscription_invoices')) return Promise.resolve({});
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await saasService.createSubscription('t1', 'pro', { trialDays: 14 });

    expect(result.status).toBe('trialing');
    const invoiceCall = mockClient.query.mock.calls.find(([sql]) => sql.includes('subscription_invoices'));
    expect(invoiceCall[1][3]).toBe('pending');
    expect(invoiceCall[1][6]).toBeNull();
  });

  it('throws when an active subscription already exists and rolls back', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockPlan()] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id FROM subscriptions')) return Promise.resolve({ rows: [{ id: 1 }] });
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(saasService.createSubscription('t1', 'pro')).rejects.toThrow('Tenant already has an active subscription. Change plan instead.');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

describe('saasService.changePlan', () => {
  it('changes plan, creates invoice and returns message', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockPlan()] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT s.*')) return Promise.resolve({ rows: [{ id: 1, plan_id: 1, old_plan_code: 'basic', current_period_end: '2026-12-31' }] });
      if (sql.includes('UPDATE subscriptions')) return Promise.resolve({});
      if (sql.includes('INSERT INTO subscription_invoices')) return Promise.resolve({});
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'active', plan: mockPlan() }] });

    const result = await saasService.changePlan('t1', 'pro');

    expect(result.message).toBe("Plan changed from 'basic' to 'pro'");
    expect(result.subscription.plan.code).toBe('pro');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('throws when tenant has no subscription', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockPlan()] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT s.*')) return Promise.resolve({ rows: [] });
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(saasService.changePlan('t1', 'pro')).rejects.toThrow('No active subscription found. Create one first.');
  });

  it('throws when already on the same plan', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockPlan()] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT s.*')) return Promise.resolve({ rows: [{ id: 1, plan_id: 2, old_plan_code: 'pro' }] });
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(saasService.changePlan('t1', 'pro')).rejects.toThrow('Already on this plan.');
  });
});

describe('saasService.cancelSubscription', () => {
  it('cancels active subscription and commits', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('UPDATE subscriptions')) return Promise.resolve({ rows: [{ id: 1 }] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await saasService.cancelSubscription('t1');

    expect(result.message).toBe('Subscription canceled. Access continues until end of current period.');
    expect(mockClient.query.mock.calls[1][0]).toContain("status = 'canceled'");
  });

  it('throws when no active subscription exists', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('UPDATE subscriptions')) return Promise.resolve({ rows: [] });
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(saasService.cancelSubscription('t1')).rejects.toThrow('No active subscription to cancel.');
  });
});

describe('saasService.handlePastDueSubscriptions', () => {
  it('downgrades subscriptions past the grace period', async () => {
    const DAY = 24 * 60 * 60 * 1000;
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1,
        tenant_id: 't1',
        current_period_end: new Date(Date.now() - 10 * DAY).toISOString(),
        plan_code: 'pro',
      }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [mockPlan({ id: 9, code: 'free' })] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await saasService.handlePastDueSubscriptions();

    const updateCall = mockQuery.mock.calls[2];
    expect(updateCall[0]).toContain("status = 'canceled'");
    expect(updateCall[1]).toEqual([9, 1]);
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('keeps subscriptions within grace period', async () => {
    const DAY = 24 * 60 * 60 * 1000;
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1,
        tenant_id: 't1',
        current_period_end: new Date(Date.now() + DAY).toISOString(),
        plan_code: 'pro',
      }],
    });

    await saasService.handlePastDueSubscriptions();

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});

describe('saasService.checkLimits', () => {
  it('allows unknown metrics without querying usage', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan: mockPlan() }] });

    const result = await saasService.checkLimits('t1', 'api_calls');

    expect(result).toEqual({ allowed: true, current: 0, limit: -1 });
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('returns allowed when current usage is below limit', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan: mockPlan() }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ current: 3 }] });

    const result = await saasService.checkLimits('t1', 'doctors');

    expect(result).toEqual({ allowed: true, current: 3, limit: 10 });
    expect(mockQuery.mock.calls[1][1]).toEqual(['t1', 'doctors']);
  });

  it('blocks when current usage reaches the limit', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan: mockPlan() }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ current: 10 }] });

    const result = await saasService.checkLimits('t1', 'doctors');

    expect(result).toEqual({ allowed: false, current: 10, limit: 10 });
  });
});

describe('saasService.recordUsage', () => {
  it('inserts usage with upsert', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await saasService.recordUsage('t1', 'doctors', 1);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (tenant_id, metric_key, recorded_at)'),
      ['t1', 'doctors', 1]
    );
  });
});

describe('saasService.getTenantUsage', () => {
  it('returns usage rows ordered by date', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ date: '2026-08-01', metric_key: 'doctors', value: 3 }] });

    const result = await saasService.getTenantUsage('t1');

    expect(result).toEqual([{ date: '2026-08-01', metric_key: 'doctors', value: 3 }]);
    expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY recorded_at DESC');
  });
});

describe('saasService.getUsageSummary', () => {
  it('sums metric values grouped by key', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { metric_key: 'doctors', total: '5' },
        { metric_key: 'patients', total: '12' },
      ],
    });

    const result = await saasService.getUsageSummary('t1');

    expect(result).toEqual({ doctors: 5, patients: 12 });
  });
});

describe('saasService.checkFeatureAccess', () => {
  it('returns true when tenant_features enables the feature', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ enabled: true }] });

    const result = await saasService.checkFeatureAccess('laboratory', 'tenant-1');

    expect(result).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('tenant_features'),
      ['tenant-1', 'laboratory']
    );
  });

  it('returns false when tenant_features disables the feature', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ enabled: false }] });

    const result = await saasService.checkFeatureAccess('laboratory', 'tenant-1');

    expect(result).toBe(false);
  });

  it('falls back to plan features when no tenant_features override', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ enabled: true }] });

    const result = await saasService.checkFeatureAccess('analytics', 'tenant-1');

    expect(result).toBe(true);
  });

  it('returns false when no subscription or override exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ enabled: false }] });

    const result = await saasService.checkFeatureAccess('premium_feature', 'tenant-no-plan');

    expect(result).toBe(false);
  });
});

describe('saasService.getTenantFeatures', () => {
  it('returns all feature flags with correct values', async () => {
    mockQuery.mockResolvedValue({ rows: [{ enabled: true }] });

    const result = await saasService.getTenantFeatures('tenant-1');

    expect(result).toHaveProperty('bookings');
    expect(result).toHaveProperty('clinical_records');
    expect(result).toHaveProperty('laboratory');
    expect(result).toHaveProperty('analytics');
    expect(result).toHaveProperty('api_access');
    expect(result).toHaveProperty('white_label');
    expect(result).toHaveProperty('custom_domain');
    expect(result).toHaveProperty('sms');
    expect(result).toHaveProperty('advanced_reports');
  });

  it('returns all boolean values', async () => {
    mockQuery.mockResolvedValue({ rows: [{ enabled: true }] });

    const result = await saasService.getTenantFeatures('tenant-1');

    for (const value of Object.values(result)) {
      expect(typeof value).toBe('boolean');
    }
  });

  it('defaults to false for unmapped features', async () => {
    mockQuery.mockResolvedValue({ rows: [{ enabled: false }] });

    const result = await saasService.getTenantFeatures('tenant-1');

    expect(result.bookings).toBe(false);
  });
});

describe('saasService.updateTenantConfig', () => {
  it('throws on unknown field', async () => {
    await expect(saasService.updateTenantConfig('t1', { hacker: 1 })).rejects.toThrow('Unknown field');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('updates multiple valid fields and stringifies config object', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 't1' }] });

    await saasService.updateTenantConfig('t1', { name: 'Clinic', locale: 'en', timezone: 'UTC', config: { theme: 'dark' } });

    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE tenants SET name = $1, locale = $2, timezone = $3, config = $4');
    expect(mockQuery.mock.calls[0][0]).toContain('WHERE id = $5');
    expect(mockQuery.mock.calls[0][1]).toEqual(['Clinic', 'en', 'UTC', '{"theme":"dark"}', 't1']);
  });

  it('skips undefined values', async () => {
    await saasService.updateTenantConfig('t1', { name: undefined });

    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('does nothing with empty data', async () => {
    await saasService.updateTenantConfig('t1', {});

    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('throws when tenant does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(saasService.updateTenantConfig('ghost', { name: 'X' })).rejects.toThrow('Tenant not found');
  });
});

describe('saasService.onboardTenant', () => {
  const baseInput = {
    tenantName: 'Clínica Test',
    domain: 'clinic.test.com',
    adminEmail: 'admin@test.com',
    adminPassword: 'secret',
    adminName: 'Ana Admin',
  };

  it('creates tenant without plan', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT 1 FROM tenants')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO tenants')) return Promise.resolve({});
      if (sql.includes('INSERT INTO users')) return Promise.resolve({});
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await saasService.onboardTenant(baseInput);

    expect(result.tenantId).toBe('clinic.test.com');
    expect(result.subscription).toBeNull();
    expect(result.message).toBe('Tenant created (no plan assigned)');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    const userCall = mockClient.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO users'));
    expect(userCall[1][0]).toBe('admin@test.com');
    expect(userCall[1][2]).toBe('Ana Admin');
    expect(userCall[1][3]).toBe('clinic.test.com');
    expect(userCall[0]).toContain("'admin'");
  });

  it('creates tenant with plan and subscription', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT 1 FROM tenants')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO tenants')) return Promise.resolve({});
      if (sql.includes('INSERT INTO users')) return Promise.resolve({});
      if (sql.includes('INSERT INTO subscriptions')) return Promise.resolve({ rows: [{ id: 7, status: 'active' }] });
      if (sql.includes('INSERT INTO subscription_invoices')) return Promise.resolve({});
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });
    mockQuery.mockResolvedValueOnce({ rows: [mockPlan()] });

    const result = await saasService.onboardTenant({ ...baseInput, planCode: 'pro' });

    expect(result.subscription).not.toBeNull();
    expect(result.subscription.plan.code).toBe('pro');
    expect(result.message).toBe("Tenant created with plan 'pro'");
  });

  it('throws when domain already exists', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT 1 FROM tenants')) return Promise.resolve({ rows: [{}] });
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(saasService.onboardTenant(baseInput)).rejects.toThrow('Tenant with this domain already exists');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('keeps subscription null when plan creation fails', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT 1 FROM tenants')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO tenants')) return Promise.resolve({});
      if (sql.includes('INSERT INTO users')) return Promise.resolve({});
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // getPlanByCode → not found

    const result = await saasService.onboardTenant({ ...baseInput, planCode: 'ghost' });

    expect(result.subscription).toBeNull();
    expect(result.message).toBe('Tenant created (no plan assigned)');
  });
});
