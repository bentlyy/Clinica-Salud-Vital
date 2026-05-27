import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/saas/saas.service.js', () => ({
  checkFeatureAccess: vi.fn(),
  checkLimits: vi.fn(),
}));

import * as saasService from '../../src/modules/saas/saas.service.js';
import { requireFeature, requireLimit } from '../../src/modules/saas/saas.features.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requireFeature', () => {
  it('calls next if feature access granted', async () => {
    vi.mocked(saasService.checkFeatureAccess).mockResolvedValue(true);
    const middleware = requireFeature('ml');
    const req = { tenant_id: 'test' };
    const res = {};
    const next = vi.fn();

    middleware(req, res, next);
    await flush();
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 if feature access denied', async () => {
    vi.mocked(saasService.checkFeatureAccess).mockResolvedValue(false);
    const middleware = requireFeature('ml');
    const req = { tenant_id: 'test' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    middleware(req, res, next);
    await flush();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ feature: 'ml' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('uses default tenant_id if not provided', async () => {
    vi.mocked(saasService.checkFeatureAccess).mockResolvedValue(true);
    const origDefault = process.env.DEFAULT_TENANT_ID;
    process.env.DEFAULT_TENANT_ID = 'default-tenant';

    const middleware = requireFeature('ml');
    const req = {};
    const res = {};
    const next = vi.fn();

    middleware(req, res, next);
    await flush();
    expect(saasService.checkFeatureAccess).toHaveBeenCalledWith('default-tenant', 'ml');
    process.env.DEFAULT_TENANT_ID = origDefault;
  });

  it('falls back to literal default when no tenant_id or env var', async () => {
    vi.mocked(saasService.checkFeatureAccess).mockResolvedValue(true);
    const origDefault = process.env.DEFAULT_TENANT_ID;
    delete process.env.DEFAULT_TENANT_ID;

    const middleware = requireFeature('ml');
    const req = {};
    const res = {};
    const next = vi.fn();

    middleware(req, res, next);
    await flush();
    expect(saasService.checkFeatureAccess).toHaveBeenCalledWith('default', 'ml');
    process.env.DEFAULT_TENANT_ID = origDefault;
  });
});

describe('requireLimit', () => {
  it('calls next if within limit', async () => {
    vi.mocked(saasService.checkLimits).mockResolvedValue({ allowed: true, current: 5, limit: 10 });
    const middleware = requireLimit('doctors');
    const req = { tenant_id: 'test' };
    const res = {};
    const next = vi.fn();

    middleware(req, res, next);
    await flush();
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 if limit reached', async () => {
    vi.mocked(saasService.checkLimits).mockResolvedValue({ allowed: false, current: 10, limit: 10 });
    const middleware = requireLimit('doctors');
    const req = { tenant_id: 'test' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    middleware(req, res, next);
    await flush();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Limit reached') }));
  });

  it('falls back to literal default for requireLimit', async () => {
    vi.mocked(saasService.checkLimits).mockResolvedValue({ allowed: true, current: 5, limit: 10 });
    const origDefault = process.env.DEFAULT_TENANT_ID;
    delete process.env.DEFAULT_TENANT_ID;

    const middleware = requireLimit('doctors');
    const req = {};
    const res = {};
    const next = vi.fn();

    middleware(req, res, next);
    await flush();
    expect(saasService.checkLimits).toHaveBeenCalledWith('default', 'doctors');
    process.env.DEFAULT_TENANT_ID = origDefault;
  });
});
