import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockClient, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockClient: { query: vi.fn(), release: vi.fn() },
  mockConnect: vi.fn(),
}));

const mockBcryptHash = vi.hoisted(() => vi.fn());

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
  mockConnect.mockResolvedValue(mockClient);
});

describe('saasService.getPlans', () => {
  it('returns hardcoded default plan', async () => {
    const result = await saasService.getPlans();
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('default');
    expect(result[0].price_monthly).toBe(0);
  });
});

describe('saasService.getPlanByCode', () => {
  it('returns default plan', async () => {
    const result = await saasService.getPlanByCode();
    expect(result.code).toBe('default');
  });
});

describe('saasService.getPlanById', () => {
  it('returns default plan', async () => {
    const result = await saasService.getPlanById();
    expect(result.code).toBe('default');
  });
});

describe('saasService.getTenantSubscription', () => {
  it('returns null', async () => {
    expect(await saasService.getTenantSubscription()).toBeNull();
  });
});

describe('saasService.getTenantPlan', () => {
  it('returns default plan', async () => {
    const result = await saasService.getTenantPlan();
    expect(result.code).toBe('default');
  });
});

describe('saasService.createSubscription', () => {
  it('returns active status', async () => {
    const result = await saasService.createSubscription();
    expect(result.status).toBe('active');
  });
});

describe('saasService.changePlan', () => {
  it('returns default plan_code', async () => {
    const result = await saasService.changePlan();
    expect(result.plan_code).toBe('default');
  });
});

describe('saasService.cancelSubscription', () => {
  it('does not throw', async () => {
    await expect(saasService.cancelSubscription()).resolves.toBeUndefined();
  });
});

describe('saasService.checkFeatureAccess', () => {
  it('always returns true', async () => {
    expect(await saasService.checkFeatureAccess()).toBe(true);
  });
});

describe('saasService.checkLimits', () => {
  it('always returns allowed', async () => {
    const result = await saasService.checkLimits();
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(-1);
  });
});

describe('saasService.recordUsage', () => {
  it('does not throw', async () => {
    await expect(saasService.recordUsage()).resolves.toBeUndefined();
  });
});

describe('saasService.getTenantUsage', () => {
  it('returns empty array', async () => {
    expect(await saasService.getTenantUsage()).toEqual([]);
  });
});

describe('saasService.getUsageSummary', () => {
  it('returns empty object', async () => {
    expect(await saasService.getUsageSummary()).toEqual({});
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

describe('saasService.onboardTenant', () => {
  it('creates tenant with subscription and admin', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('SELECT 1 FROM tenants')) return Promise.resolve({ rows: [] });
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
