import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockLogger } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery, on: vi.fn() },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: mockLogger,
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DEFAULT_TENANT_ID = 'default';
  tenantService.clear();
});

import { tenantService, getTenantId, loadTenantsFromDB } from '../../src/shared/multi-tenant.service.js';

const sampleTenant = {
  id: 'tenant-1',
  name: 'Clínica Salud',
  domain: 'salud.cl',
  locale: 'es',
  timezone: 'America/Santiago',
  config: { company: 'Salud Ltda' },
  active: true,
};

describe('tenantService.register', () => {
  it('registers a tenant and makes it retrievable', () => {
    tenantService.register(sampleTenant);
    expect(tenantService.getById('tenant-1')).toEqual(sampleTenant);
    expect(tenantService.getByDomain('salud.cl')).toEqual(sampleTenant);
  });
});

describe('tenantService.getById', () => {
  it('returns undefined for unknown id', () => {
    expect(tenantService.getById('nonexistent')).toBeUndefined();
  });

  it('returns tenant after registration', () => {
    tenantService.register(sampleTenant);
    expect(tenantService.getById('tenant-1')).toEqual(sampleTenant);
  });
});

describe('tenantService.getByDomain', () => {
  it('returns undefined for unknown domain', () => {
    expect(tenantService.getByDomain('unknown.cl')).toBeUndefined();
  });

  it('returns tenant by domain', () => {
    tenantService.register(sampleTenant);
    expect(tenantService.getByDomain('salud.cl')).toEqual(sampleTenant);
  });
});

describe('tenantService.getAll', () => {
  it('returns empty array when no tenants registered', () => {
    expect(tenantService.getAll()).toEqual([]);
  });

  it('returns all registered tenants', () => {
    tenantService.register(sampleTenant);
    tenantService.register({ ...sampleTenant, id: 'tenant-2', domain: 'otra.cl' });
    expect(tenantService.getAll()).toHaveLength(2);
  });
});

describe('tenantService.clear', () => {
  it('clears all tenants', () => {
    tenantService.register(sampleTenant);
    tenantService.clear();
    expect(tenantService.getAll()).toEqual([]);
    expect(tenantService.getById('tenant-1')).toBeUndefined();
  });
});

describe('tenantService.loadFromDB', () => {
  it('loads tenants from database and caches them', async () => {
    const dbTenants = [
      { id: 'db-1', name: 'DB Tenant', domain: 'db.cl', locale: 'es', timezone: 'UTC', config: {}, active: true },
      { id: 'db-2', name: 'DB Tenant 2', domain: 'db2.cl', locale: 'en', timezone: 'UTC', config: {}, active: true },
    ];
    mockQuery.mockResolvedValue({ rows: dbTenants });

    await tenantService.loadFromDB();

    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT id, name, domain, locale, timezone, config, active FROM tenants WHERE active = true'
    );
    expect(tenantService.getById('db-1')).toEqual(dbTenants[0]);
    expect(tenantService.getById('db-2')).toEqual(dbTenants[1]);
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it('handles database errors gracefully', async () => {
    mockQuery.mockRejectedValue(new Error('DB connection failed'));

    await expect(tenantService.loadFromDB()).resolves.not.toThrow();
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to load tenants from DB', expect.anything());
  });

  it('loads empty tenant list from DB', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await tenantService.loadFromDB();
    expect(tenantService.getAll()).toEqual([]);
  });

  it('prevents concurrent loads with loading lock', async () => {
    let resolveQuery;
    const queryPromise = new Promise((resolve) => { resolveQuery = resolve; });
    mockQuery.mockReturnValue(queryPromise);

    const first = tenantService.loadFromDB();
    const second = tenantService.loadFromDB();

    resolveQuery({ rows: [] });
    await Promise.all([first, second]);

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});

describe('getTenantId', () => {
  it('returns tenant_id from request', () => {
    expect(getTenantId({ headers: {}, tenant_id: 'tenant-1' })).toBe('tenant-1');
  });

  it('falls back to DEFAULT_TENANT_ID env var', () => {
    expect(getTenantId({ headers: {} })).toBe('default');
  });

  it('returns "default" if no tenant_id and no env var', () => {
    delete process.env.DEFAULT_TENANT_ID;
    expect(getTenantId({ headers: {} })).toBe('default');
  });
});

describe('loadTenantsFromDB', () => {
  it('delegates to tenantService.loadFromDB', () => {
    expect(typeof loadTenantsFromDB).toBe('function');
    expect(loadTenantsFromDB.name).toBe('bound loadFromDB');
  });
});
