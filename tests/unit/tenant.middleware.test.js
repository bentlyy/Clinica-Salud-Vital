import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }), connect: vi.fn(), on: vi.fn() },
  setTenantContext: vi.fn().mockResolvedValue(undefined),
  verifyTenantContext: vi.fn().mockResolvedValue(true),
  tenantAls: { run: vi.fn((_store, fn) => fn()), getStore: vi.fn(() => null) },
  query: vi.fn().mockResolvedValue({ rows: [] }),
}));

import { tenantService } from '../../src/shared/multi-tenant.service.js';

beforeEach(() => {
  tenantService.clear();
  delete process.env.NODE_ENV;
  process.env.APP_LOCALE = 'es';
});

describe('tenant.middleware', () => {
  it('uses X-Tenant-Id header', async () => {
    tenantService.register({ id: 'clinic-1', name: 'Clinic 1', locale: 'en', timezone: 'UTC', config: {}, active: true });
    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: { 'x-tenant-id': 'clinic-1' }, path: '/api/bookings' };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    await tenantMiddleware(req, res, next);

    expect(req.tenant_id).toBe('clinic-1');
    expect(res.setHeader).toHaveBeenCalledWith('X-Tenant-Id', 'clinic-1');
    expect(next).toHaveBeenCalled();
  });

  it('uses tenant from user JWT if available', async () => {
    tenantService.register({ id: 'jwt-tenant', name: 'JWT Tenant', locale: 'fr', timezone: 'UTC', config: {}, active: true });
    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: {}, user: { tenant_id: 'jwt-tenant' }, path: '/api/bookings' };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    await tenantMiddleware(req, res, next);

    expect(req.tenant_id).toBe('jwt-tenant');
    expect(req.locale).toBe('fr');
    expect(next).toHaveBeenCalled();
  });

  it('JWT tenant_id takes precedence over X-Tenant-Id header', async () => {
    tenantService.register({ id: 'from-jwt', name: 'From JWT', locale: 'en', timezone: 'UTC', config: {}, active: true });
    tenantService.register({ id: 'from-header', name: 'From Header', locale: 'fr', timezone: 'UTC', config: {}, active: true });
    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: { 'x-tenant-id': 'from-header' }, user: { tenant_id: 'from-jwt' }, path: '/api/bookings' };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    await tenantMiddleware(req, res, next);

    expect(req.tenant_id).toBe('from-jwt');
    expect(next).toHaveBeenCalled();
  });

  it('falls back to default tenant when no tenant_id found on public path', async () => {
    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: { 'accept-language': 'fr-FR,fr;q=0.9' }, path: '/health' };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    await tenantMiddleware(req, res, next);

    expect(req.tenant_id).toBe('default');
    expect(req.locale).toBe('fr');
    expect(next).toHaveBeenCalled();
  });

  it('rejects with BadRequestError on non-public path in production when no tenant', async () => {
    process.env.NODE_ENV = 'production';
    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: {}, path: '/api/bookings' };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    await tenantMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'X-Tenant-Id header is required' }));
  });

  it('rejects tenant not found on non-public path', async () => {
    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: { 'x-tenant-id': 'nonexistent' }, path: '/api/bookings' };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    await tenantMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Tenant not found or inactive' }));
  });

  it('uses default tenant when no X-Tenant-Id header in non-production', async () => {
    delete process.env.NODE_ENV;
    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: {}, path: '/api/bookings' };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    await tenantMiddleware(req, res, next);

    expect(req.tenant_id).toBe('default');
    expect(next).toHaveBeenCalled();
  });

  it('rejects when loadTenantsFromDB fails and tenant not cached', async () => {
    const { tenantMiddleware } = await import('../../src/middlewares/tenant.middleware.js');
    const req = { headers: { 'x-tenant-id': 'unknown-tenant' }, path: '/api/bookings' };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    await tenantMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Tenant not found or inactive' }));
  });
});
