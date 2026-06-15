import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/saas/saas.service.js', () => ({
  getPlans: vi.fn(),
  getTenantPlan: vi.fn(),
  getTenantSubscription: vi.fn(),
  changePlan: vi.fn(),
  cancelSubscription: vi.fn(),
  onboardTenant: vi.fn(),
  updateTenantConfig: vi.fn(),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import * as saasService from '../../src/modules/saas/saas.service.js';
import * as saasController from '../../src/modules/saas/saas.controller.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('saasController.getPlans', () => {
  it('returns plans', async () => {
    vi.mocked(saasService.getPlans).mockResolvedValue([{ id: 0, code: 'default' }]);
    const res = { json: vi.fn() };

    saasController.getPlans({}, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 0, code: 'default' }] });
  });
});

describe('saasController.getMySubscription', () => {
  it('returns null subscription and default plan', async () => {
    vi.mocked(saasService.getTenantPlan).mockResolvedValue({ code: 'default' });
    const req = { tenant_id: 'test' };
    const res = { json: vi.fn() };

    saasController.getMySubscription(req, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({ subscription: null, plan: { code: 'default' } });
  });
});

describe('saasController.createCheckout', () => {
  it('returns simulated URL', async () => {
    const req = { tenant_id: 'test', body: { plan_code: 'default' } };
    const res = { json: vi.fn() };

    saasController.createCheckout(req, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({ url: expect.stringContaining('/saas/success'), session_id: 'simulated' });
  });
});

describe('saasController.stripeWebhook', () => {
  it('handles webhook', async () => {
    const req = { headers: { 'stripe-signature': 'sig' }, body: {} };
    const res = { json: vi.fn() };

    saasController.stripeWebhook(req, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});

describe('saasController.changePlan', () => {
  it('changes plan and returns result', async () => {
    const result = { plan_code: 'default', message: 'Plan unchanged (single plan)' };
    vi.mocked(saasService.changePlan).mockResolvedValue(result);
    const req = { tenant_id: 'test', body: { plan_code: 'pro' } };
    const res = { json: vi.fn() };

    saasController.changePlan(req, res, vi.fn());
    await flush();
    expect(saasService.changePlan).toHaveBeenCalledWith();
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('saasController.cancelSubscription', () => {
  it('cancels and returns message', async () => {
    const req = { tenant_id: 'test' };
    const res = { json: vi.fn() };

    saasController.cancelSubscription(req, res, vi.fn());
    await flush();
    expect(saasService.cancelSubscription).toHaveBeenCalledWith();
    expect(res.json).toHaveBeenCalledWith({ message: 'Subscription canceled' });
  });
});

describe('saasController.getUsage', () => {
  it('returns empty usage', async () => {
    const req = { tenant_id: 'test', query: {} };
    const res = { json: vi.fn() };

    saasController.getUsage(req, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({});
  });
});

describe('saasController.getUsageSummary', () => {
  it('returns empty summary', async () => {
    const req = { tenant_id: 'test' };
    const res = { json: vi.fn() };

    saasController.getUsageSummary(req, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({});
  });
});

describe('saasController.onboardTenant', () => {
  it('creates tenant and returns 201', async () => {
    vi.mocked(saasService.onboardTenant).mockResolvedValue({ tenantId: 'new-tenant' });
    const req = { body: { tenant_name: 'Test Clinic', domain: 'test', captcha_token: '' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    saasController.onboardTenant(req, res, vi.fn());
    await flush();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ tenantId: 'new-tenant' });
  });
});

describe('saasController.getLimits', () => {
  it('returns hardcoded limits', async () => {
    const req = { tenant_id: 'test' };
    const res = { json: vi.fn() };

    saasController.getLimits(req, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({
      doctors: { allowed: true, current: 0, limit: -1 },
      patients: { allowed: true, current: 0, limit: -1 },
      storage: { allowed: true, current: 0, limit: -1 },
    });
  });
});

describe('saasController.updateTenantConfig', () => {
  it('updates config', async () => {
    const req = { tenant_id: 'test', body: { name: 'New Name', locale: 'en' } };
    const res = { json: vi.fn() };

    saasController.updateTenantConfig(req, res, vi.fn());
    await flush();
    expect(saasService.updateTenantConfig).toHaveBeenCalledWith('test', { name: 'New Name', locale: 'en' });
    expect(res.json).toHaveBeenCalledWith({ message: 'Configuration updated' });
  });

  it('returns 400 when no valid fields', async () => {
    const req = { tenant_id: 'test', body: {} };
    const next = vi.fn();
    const res = { json: vi.fn() };

    saasController.updateTenantConfig(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: expect.stringContaining('No valid fields') })
    );
  });
});
