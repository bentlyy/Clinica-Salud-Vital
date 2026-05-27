import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { tenantService } from '../../src/shared/multi-tenant.service.js';

beforeEach(() => {
  tenantService.clear();
});

describe('tenant.middleware', () => {
  it('sets tenant_id from header', async () => {
    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: { 'x-tenant-id': 'custom-tenant', host: 'example.com' } };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    tenantMiddleware(req, res, next);

    expect(req.tenant_id).toBe('custom-tenant');
    expect(res.setHeader).toHaveBeenCalledWith('X-Tenant-Id', 'custom-tenant');
    expect(next).toHaveBeenCalled();
  });

  it('extracts tenant from subdomain when no header', async () => {
    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: { host: 'tenant1.mysystem.com' } };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    tenantMiddleware(req, res, next);

    expect(req.tenant_id).toBe('tenant1');
    expect(next).toHaveBeenCalled();
  });

  it('uses tenant from registry if found', async () => {
    tenantService.register({ id: 'clinic-1', name: 'Clinic 1', domain: 'clinic1.example.com', locale: 'en', timezone: 'America/New_York', config: {}, active: true });

    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: { 'x-tenant-id': 'clinic-1', host: 'clinic1.example.com' } };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    tenantMiddleware(req, res, next);

    expect(req.tenant_id).toBe('clinic-1');
    expect(req.locale).toBe('en');
  });

  it('uses locale from accept-language when tenant not in registry', async () => {
    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: { 'x-tenant-id': 'unknown', 'accept-language': 'fr-FR,fr;q=0.9', host: 'unknown.com' } };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    tenantMiddleware(req, res, next);

    expect(req.tenant_id).toBe('unknown');
    expect(req.locale).toBe('fr');
  });

  it('defaults to default tenant when no tenant header or subdomain', async () => {
    process.env.DEFAULT_TENANT_ID = 'default';
    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: { host: 'example.com' } };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    tenantMiddleware(req, res, next);

    expect(req.tenant_id).toBe('default');
    expect(req.locale).toBe('es');
  });
});
