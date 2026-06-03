import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }), connect: vi.fn(), on: vi.fn() },
  setTenantContext: vi.fn().mockResolvedValue(undefined),
}));

import { tenantService } from '../../src/shared/multi-tenant.service.js';

beforeEach(() => {
  tenantService.clear();
});

describe('tenant.middleware', () => {
  it('extracts tenant from subdomain', async () => {
    tenantService.register({ id: 'custom', name: 'Custom', domain: 'custom.example.com', locale: 'en', timezone: 'UTC', config: {}, active: true });
    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: { host: 'custom.example.com' } };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    await tenantMiddleware(req, res, next);

    expect(req.tenant_id).toBe('custom');
    expect(res.setHeader).toHaveBeenCalledWith('X-Tenant-Id', 'custom');
    expect(next).toHaveBeenCalled();
  });

  it('extracts tenant from subdomain when no header', async () => {
    tenantService.register({ id: 'tenant1', name: 'Tenant 1', domain: 'tenant1.mysystem.com', locale: 'en', timezone: 'UTC', config: {}, active: true });
    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: { host: 'tenant1.mysystem.com' } };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    await tenantMiddleware(req, res, next);

    expect(req.tenant_id).toBe('tenant1');
    expect(next).toHaveBeenCalled();
  });

  it('uses tenant from registry if found', async () => {
    tenantService.register({ id: 'clinic-1', name: 'Clinic 1', domain: 'clinic-1.example.com', locale: 'en', timezone: 'America/New_York', config: {}, active: true });

    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: { host: 'clinic-1.example.com' } };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    await tenantMiddleware(req, res, next);

    expect(req.tenant_id).toBe('clinic-1');
    expect(req.locale).toBe('en');
  });

  it('falls back to default tenant when host does not match registry', async () => {
    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: { 'accept-language': 'fr-FR,fr;q=0.9', host: 'unknown.com' } };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    await tenantMiddleware(req, res, next);

    expect(req.tenant_id).toBe(process.env.DEFAULT_TENANT_ID || 'default');
    expect(req.locale).toBe('fr');
  });

  it('defaults to default tenant when no subdomain match', async () => {
    process.env.DEFAULT_TENANT_ID = 'default';
    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: { host: 'example.com' } };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    await tenantMiddleware(req, res, next);

    expect(req.tenant_id).toBe('default');
    expect(req.locale).toBe('es');
  });
});
