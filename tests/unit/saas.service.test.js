import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockClient, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockClient: { query: vi.fn(), release: vi.fn() },
  mockConnect: vi.fn(),
}));

const mockBcryptHash = vi.hoisted(() => vi.fn());
const mockBcryptCompare = vi.hoisted(() => vi.fn());

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

import * as saasService from '../../src/modules/saas/saas.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockClient.query.mockReset();
  mockConnect.mockReset();
  mockConnect.mockReturnValue(mockClient);
});

describe('saasService.getPlans', () => {
  it('returns active plans ordered by sort_order', async () => {
    const mockPlans = [{ id: 1, code: 'free', name: 'Free', active: true, sort_order: 1 }];
    mockQuery.mockResolvedValueOnce({ rows: mockPlans });
    const result = await saasService.getPlans();
    expect(result).toEqual(mockPlans);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE active = true'));
  });

  it('returns empty array when no plans', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await saasService.getPlans();
    expect(result).toEqual([]);
  });
});

describe('saasService.getPlanByCode', () => {
  it('returns plan for valid code', async () => {
    const plan = { id: 1, code: 'free', name: 'Free' };
    mockQuery.mockResolvedValueOnce({ rows: [plan] });
    const result = await saasService.getPlanByCode('free');
    expect(result).toEqual(plan);
  });

  it('throws NotFoundError for invalid code', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(saasService.getPlanByCode('nonexistent')).rejects.toThrow('Plan not found');
  });
});

describe('saasService.getPlanById', () => {
  it('returns plan for valid id', async () => {
    const plan = { id: 1, code: 'free' };
    mockQuery.mockResolvedValueOnce({ rows: [plan] });
    expect(await saasService.getPlanById(1)).toEqual(plan);
  });

  it('throws for invalid id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(saasService.getPlanById(999)).rejects.toThrow('Plan not found');
  });
});

describe('saasService.getTenantSubscription', () => {
  it('returns active subscription', async () => {
    const sub = { id: 1, tenant_id: 'test', plan_id: 1, status: 'active' };
    mockQuery.mockResolvedValueOnce({ rows: [sub] });
    expect(await saasService.getTenantSubscription('test')).toEqual(sub);
  });

  it('returns null when no subscription', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect(await saasService.getTenantSubscription('test')).toBeNull();
  });
});

describe('saasService.getTenantPlan', () => {
  it('returns plan when subscription exists', async () => {
    const sub = { id: 1, plan_id: 2 };
    const plan = { id: 2, code: 'pro' };
    mockQuery.mockResolvedValueOnce({ rows: [sub] });
    mockQuery.mockResolvedValueOnce({ rows: [plan] });
    expect(await saasService.getTenantPlan('test')).toEqual(plan);
  });

  it('returns null when no subscription', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect(await saasService.getTenantPlan('test')).toBeNull();
  });
});

describe('saasService.createSubscription', () => {
  it('creates subscription for tenant', async () => {
    const plan = { id: 1, code: 'free' };
    mockQuery.mockResolvedValueOnce({ rows: [plan] });
    const newSub = { id: 1, tenant_id: 'test', plan_id: 1, status: 'active' };
    mockQuery.mockResolvedValueOnce({ rows: [newSub] });
    const result = await saasService.createSubscription('test', 'free');
    expect(result.status).toBe('active');
  });

  it('throws if tenant already has subscription', async () => {
    const plan = { id: 1, code: 'free' };
    mockQuery.mockResolvedValueOnce({ rows: [plan] });
    const pgError = new Error('duplicate key value violates unique constraint');
    pgError.code = '23505';
    pgError.constraint = 'idx_subscriptions_active_tenant';
    mockQuery.mockRejectedValueOnce(pgError);
    await expect(saasService.createSubscription('test', 'free')).rejects.toThrow('Tenant already has an active subscription');
  });

  it('throws if plan not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(saasService.createSubscription('test', 'invalid')).rejects.toThrow('Plan not found');
  });
});

describe('saasService.changePlan', () => {
  it('changes plan successfully', async () => {
    const plan = { id: 2, code: 'pro', max_doctors: -1, max_patients: -1 };
    const sub = { id: 10, plan_id: 1 };
    const innerPlan = { id: 1, code: 'free', max_doctors: -1, max_patients: -1 };

    mockQuery.mockImplementation((sql) => {
      if (sql.includes('WHERE code = ')) {
        if (sql.includes('pro')) return Promise.resolve({ rows: [plan] });
        return Promise.resolve({ rows: [innerPlan] });
      }
      if (sql.includes('FROM subscriptions')) {
        return Promise.resolve({ rows: [sub] });
      }
      if (sql.includes('FROM plans WHERE id')) {
        return Promise.resolve({ rows: [innerPlan] });
      }
      if (sql.includes('COUNT(*) as count')) {
        return Promise.resolve({ rows: [{ count: '0' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('UPDATE subscriptions')) return Promise.resolve({ rows: [{ id: 10, plan_id: 2 }] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await saasService.changePlan('test', 'pro');
    expect(result.plan_id).toBe(2);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('throws if no active subscription', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('WHERE code = ')) return Promise.resolve({ rows: [{ id: 1, code: 'pro' }] });
      if (sql.includes('FROM subscriptions')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await expect(saasService.changePlan('test', 'pro')).rejects.toThrow('No active subscription found');
  });

  it('throws if doctor limit exceeded', async () => {
    const newPlan = { id: 2, code: 'basic', max_doctors: 3, max_patients: -1 };
    const oldPlan = { id: 1, code: 'free', max_doctors: 1, max_patients: -1 };
    const sub = { id: 10, plan_id: 1 };

    mockQuery
      .mockResolvedValueOnce({ rows: [newPlan] })            // getPlanByCode('basic')
      .mockResolvedValueOnce({ rows: [sub] })                 // getTenantSubscription
      .mockResolvedValueOnce({ rows: [sub] })                 // getTenantPlan → getTenantSubscription
      .mockResolvedValueOnce({ rows: [oldPlan] })             // getPlanById(old plan)
      .mockResolvedValueOnce({ rows: [{ count: '5' }] })      // checkLimits COUNT doctors
      .mockResolvedValueOnce({ rows: [] });                   // fallback

    mockClient.query.mockResolvedValue({ rows: [] });

    await expect(saasService.changePlan('test', 'basic')).rejects.toThrow('allows max 3 doctors');
  });

  it('throws if patient limit exceeded', async () => {
    const newPlan = { id: 2, code: 'basic', max_doctors: -1, max_patients: 200 };
    const oldPlan = { id: 1, code: 'free', max_doctors: -1, max_patients: -1 };
    const sub = { id: 10, plan_id: 1 };

    mockQuery
      .mockResolvedValueOnce({ rows: [newPlan] })            // getPlanByCode('basic')
      .mockResolvedValueOnce({ rows: [sub] })                 // getTenantSubscription
      .mockResolvedValueOnce({ rows: [sub] })                 // getTenantPlan → getTenantSubscription
      .mockResolvedValueOnce({ rows: [oldPlan] })             // getPlanById(old plan)
      .mockResolvedValueOnce({ rows: [{ count: '5' }] })      // checkLimits COUNT doctors
      .mockResolvedValueOnce({ rows: [sub] })                 // getTenantPlan → getTenantSubscription(2nd)
      .mockResolvedValueOnce({ rows: [oldPlan] })             // getPlanById(old plan)
      .mockResolvedValueOnce({ rows: [{ count: '300' }] })    // checkLimits COUNT patients(users)
      .mockResolvedValueOnce({ rows: [] });                   // fallback

    mockClient.query.mockResolvedValue({ rows: [] });

    await expect(saasService.changePlan('test', 'basic')).rejects.toThrow('allows max 200 patients');
  });

  it('rolls back on error', async () => {
    const plan = { id: 5, code: 'pro', max_doctors: -1, max_patients: -1 };
    const sub = { id: 10, plan_id: 1 };
    const innerPlan = { id: 1, code: 'free', max_doctors: -1, max_patients: -1 };

    mockQuery.mockImplementation((sql) => {
      if (sql.includes('WHERE code = ')) {
        if (sql.includes('pro')) return Promise.resolve({ rows: [plan] });
        return Promise.resolve({ rows: [innerPlan] });
      }
      if (sql.includes('FROM subscriptions')) return Promise.resolve({ rows: [sub] });
      if (sql.includes('FROM plans WHERE id')) return Promise.resolve({ rows: [innerPlan] });
      if (sql.includes('COUNT(*) as count')) return Promise.resolve({ rows: [{ count: '0' }] });
      return Promise.resolve({ rows: [] });
    });

    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('UPDATE subscriptions')) return Promise.reject(new Error('DB error'));
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(saasService.changePlan('test', 'pro')).rejects.toThrow('DB error');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

describe('saasService.cancelSubscription', () => {
  it('cancels active subscription', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'active' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await saasService.cancelSubscription('test');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("status = 'canceled'"), [1]);
  });

  it('throws if no subscription', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(saasService.cancelSubscription('test')).rejects.toThrow('No active subscription found');
  });
});

describe('saasService.updateTenantConfig', () => {
  it('updates allowed fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'test' }] });
    await saasService.updateTenantConfig('test', { name: 'New Name', locale: 'en' });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE tenants SET'), expect.any(Array));
  });

  it('throws for unknown fields', async () => {
    await expect(saasService.updateTenantConfig('test', { unknown: 'value' })).rejects.toThrow('Unknown field');
  });

  it('handles undefined values silently', async () => {
    await saasService.updateTenantConfig('test', { name: undefined });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('serializes object values as JSON', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'test' }] });
    await saasService.updateTenantConfig('test', { config: { theme: 'dark' } });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([expect.stringContaining('"theme"')])
    );
  });

  it('throws if tenant not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(saasService.updateTenantConfig('nonexistent', { name: 'Name' })).rejects.toThrow('Tenant not found');
  });
});

describe('saasService.checkFeatureAccess', () => {
  it('returns true if feature in plan', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, features: { ml: true } }] });
    const result = await saasService.checkFeatureAccess('test', 'ml');
    expect(result).toBe(true);
  });

  it('checks tenant_features override', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, features: { ml: false } }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ enabled: true }] });
    const result = await saasService.checkFeatureAccess('test', 'ml');
    expect(result).toBe(true);
  });

  it('returns false when no plan', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect(await saasService.checkFeatureAccess('test', 'ml')).toBe(false);
  });

  it('returns false when feature not in plan and no override', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, features: {} }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await saasService.checkFeatureAccess('test', 'ml');
    expect(result).toBe(false);
  });
});

describe('saasService.checkLimits', () => {
  it('returns doctor counts', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, max_doctors: 5 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] });
    const result = await saasService.checkLimits('test', 'doctors');
    expect(result.current).toBe(3);
    expect(result.limit).toBe(5);
    expect(result.allowed).toBe(true);
  });

  it('returns patients counts', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, max_doctors: -1, max_patients: 200 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] });
    const result = await saasService.checkLimits('test', 'patients');
    expect(result.current).toBe(10);
    expect(result.limit).toBe(200);
    expect(result.allowed).toBe(true);
  });

  it('returns storage usage', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, max_doctors: -1, max_patients: -1, storage_gb: 1, features: {} }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ bytes: '52428800' }] });
    const result = await saasService.checkLimits('test', 'storage');
    expect(result.current).toBe(50);
    expect(result.limit).toBe(1024);
  });

  it('returns ml_predictions usage', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, max_doctors: -1, max_patients: -1, storage_gb: 1, features: { ml: true } }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '500' }] });
    const result = await saasService.checkLimits('test', 'ml_predictions');
    expect(result.current).toBe(500);
    expect(result.limit).toBe(1000);
  });

  it('returns ml_predictions with explicit limit', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, max_doctors: -1, max_patients: -1, storage_gb: 1, features: { ml_predictions_limit: 2000 } }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '500' }] });
    const result = await saasService.checkLimits('test', 'ml_predictions');
    expect(result.limit).toBe(2000);
  });

  it('returns ml_predictions with ml disabled', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, max_doctors: -1, max_patients: -1, storage_gb: 1, features: {} }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '500' }] });
    const result = await saasService.checkLimits('test', 'ml_predictions');
    expect(result.limit).toBe(0);
  });

  it('returns ml_training usage', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, max_doctors: -1, max_patients: -1, storage_gb: 1, features: { ml: true } }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '5' }] });
    const result = await saasService.checkLimits('test', 'ml_training');
    expect(result.current).toBe(5);
    expect(result.limit).toBe(10);
  });

  it('returns ml_training with explicit limit', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, max_doctors: -1, max_patients: -1, storage_gb: 1, features: { ml_training_limit: 50 } }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '5' }] });
    const result = await saasService.checkLimits('test', 'ml_training');
    expect(result.limit).toBe(50);
  });

  it('returns ml_training with ml disabled', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ plan_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, max_doctors: -1, max_patients: -1, storage_gb: 1, features: {} }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '5' }] });
    const result = await saasService.checkLimits('test', 'ml_training');
    expect(result.limit).toBe(0);
  });

  it('returns false when no plan', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await saasService.checkLimits('test', 'doctors');
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(0);
  });
});

describe('saasService.recordUsage', () => {
  it('records usage with upsert', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await saasService.recordUsage('test', 'api_calls');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT'), expect.any(Array));
  });
});

describe('saasService.getTenantUsage', () => {
  it('returns usage data', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ date: '2026-05-01', value: 10 }] });
    const result = await saasService.getTenantUsage('test', 'api_calls');
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-05-01');
  });
});

describe('saasService.getUsageSummary', () => {
  it('returns aggregated summary', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ metric_key: 'api_calls', total: '150' }] });
    const result = await saasService.getUsageSummary('test');
    expect(result.api_calls).toBe(150);
  });

  it('returns empty object when no usage', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect(await saasService.getUsageSummary('test')).toEqual({});
  });
});

describe('saasService.onboardTenant', () => {
  it('creates tenant with subscription and admin', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('SELECT 1 FROM tenants')) return Promise.resolve({ rows: [] });
      if (sql.includes('WHERE code =')) return Promise.resolve({ rows: [{ id: 1, code: 'free' }] });
      return Promise.resolve({ rows: [] });
    });

    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await saasService.onboardTenant({
      tenantName: 'Test Clinic',
      domain: 'test-clinic',
      adminEmail: 'admin@test.com',
      adminPassword: 'TestPass123!',
    });

    expect(result.tenantId).toBe('test-clinic');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('creates tenant with specific planCode', async () => {
    const proPlan = { id: 2, code: 'pro' };

    mockQuery
      .mockResolvedValueOnce({ rows: [proPlan] })             // getPlanByCode('pro')
      .mockResolvedValueOnce({ rows: [] });                   // fallback

    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await saasService.onboardTenant({
      tenantName: 'Pro Clinic',
      domain: 'pro-clinic',
      adminEmail: 'admin@pro.com',
      adminPassword: 'TestPass123!',
      planCode: 'pro',
    });

    expect(result.tenantId).toBe('pro-clinic');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('throws if domain already exists', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql.includes('SELECT 1 FROM tenants')) return Promise.resolve({ rows: [{ id: 'existing' }] });
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });
    await expect(saasService.onboardTenant({
      tenantName: 'Test',
      domain: 'existing',
      adminEmail: 'admin@test.com',
      adminPassword: 'TestPass123!',
    })).rejects.toThrow('already exists');
  });

  it('rolls back on error', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('SELECT 1 FROM tenants')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('INSERT INTO tenants')) return Promise.reject(new Error('DB error'));
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(saasService.onboardTenant({
      tenantName: 'Test',
      domain: 'test-clinic',
      adminEmail: 'admin@test.com',
      adminPassword: 'TestPass123!',
    })).rejects.toThrow('DB error');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});
