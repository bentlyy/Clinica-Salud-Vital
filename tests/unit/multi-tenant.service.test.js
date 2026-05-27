import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    on: vi.fn(),
  },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { tenantService, extractTenantFromHost, getTenantId } from '../../src/shared/multi-tenant.service.js';

beforeEach(() => {
  tenantService.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  tenantService.stopRefresh();
});

describe('tenantService', () => {
  it('register stores tenant by id and domain', () => {
    const tenant = { id: 'clinic-1', name: 'Clinic 1', domain: 'clinic1.example.com', locale: 'es', timezone: 'America/Santiago', config: {}, active: true };
    tenantService.register(tenant);

    expect(tenantService.getById('clinic-1')).toEqual(tenant);
    expect(tenantService.getByDomain('clinic1.example.com')).toEqual(tenant);
  });

  it('getAll returns unique tenants', () => {
    const tenant = { id: 'clinic-1', name: 'Clinic 1', domain: 'clinic1.example.com', locale: 'es', timezone: 'America/Santiago', config: {}, active: true };
    tenantService.register(tenant);

    const all = tenantService.getAll();
    expect(all).toHaveLength(1);
  });

  it('getById returns undefined for unknown tenant', () => {
    expect(tenantService.getById('unknown')).toBeUndefined();
  });

  it('getByDomain returns undefined for unknown domain', () => {
    expect(tenantService.getByDomain('unknown.com')).toBeUndefined();
  });

  it('clear removes all tenants', () => {
    tenantService.register({ id: 'test', name: 'Test', domain: 'test.com', locale: 'es', timezone: 'UTC', config: {}, active: true });
    tenantService.clear();
    expect(tenantService.getAll()).toHaveLength(0);
  });

  it('loadFromDB loads tenants from database', async () => {
    const tenants = [
      { id: 'clinic-1', name: 'Clinic 1', domain: 'clinic1.com', locale: 'es', timezone: 'America/Santiago', config: {}, active: true },
      { id: 'clinic-2', name: 'Clinic 2', domain: 'clinic2.com', locale: 'en', timezone: 'America/New_York', config: {}, active: true },
    ];
    mockQuery.mockResolvedValueOnce({ rows: tenants });

    await tenantService.loadFromDB();

    expect(tenantService.getById('clinic-1')).toBeDefined();
    expect(tenantService.getByDomain('clinic2.com')).toBeDefined();
    expect(tenantService.getAll()).toHaveLength(2);
  });

  it('loadFromDB handles DB errors gracefully', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection failed'));

    await expect(tenantService.loadFromDB()).resolves.not.toThrow();
    expect(tenantService.getAll()).toHaveLength(0);
  });

  it('loadFromDB replaces existing tenants', async () => {
    tenantService.register({ id: 'old', name: 'Old', domain: 'old.com', locale: 'es', timezone: 'UTC', config: {}, active: true });

    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'new', name: 'New', domain: 'new.com', locale: 'en', timezone: 'UTC', config: {}, active: true }] });

    await tenantService.loadFromDB();

    expect(tenantService.getById('old')).toBeUndefined();
    expect(tenantService.getById('new')).toBeDefined();
  });

  it('startRefresh starts interval', async () => {
    vi.useFakeTimers();
    tenantService.startRefresh();
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it('startRefresh clears existing interval before starting new one', async () => {
    vi.useFakeTimers();
    tenantService.startRefresh();
    const firstCount = vi.getTimerCount();
    tenantService.startRefresh();
    expect(vi.getTimerCount()).toBe(firstCount);
    vi.useRealTimers();
  });

  it('stopRefresh clears interval', async () => {
    vi.useFakeTimers();
    tenantService.startRefresh();
    tenantService.stopRefresh();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});

describe('extractTenantFromHost', () => {
  it('extracts subdomain from 3+ part host', () => {
    expect(extractTenantFromHost('clinic1.mysystem.com')).toBe('clinic1');
    expect(extractTenantFromHost('tenant.myservice.co.uk')).toBe('tenant');
  });

  it('returns null for 2-part host', () => {
    expect(extractTenantFromHost('mysystem.com')).toBeNull();
  });

  it('returns null for empty host', () => {
    expect(extractTenantFromHost('')).toBeNull();
  });

  it('returns null for null host', () => {
    expect(extractTenantFromHost(null)).toBeNull();
  });
});

describe('getTenantId', () => {
  it('returns tenant_id from request', () => {
    expect(getTenantId({ headers: {}, tenant_id: 'custom-tenant' })).toBe('custom-tenant');
  });

  it('returns default when no tenant_id', () => {
    process.env.DEFAULT_TENANT_ID = 'default-tenant';
    expect(getTenantId({ headers: {} })).toBe('default-tenant');
  });

  it('returns literal default string when no tenant_id or DEFAULT_TENANT_ID', () => {
    delete process.env.DEFAULT_TENANT_ID;
    expect(getTenantId({ headers: {} })).toBe('default');
  });
});
