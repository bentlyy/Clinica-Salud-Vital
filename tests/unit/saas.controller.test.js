import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/saas/saas.service.js', () => ({
  getPlans: vi.fn(),
  getTenantSubscription: vi.fn(),
  getPlanById: vi.fn(),
  getPlanByCode: vi.fn(),
  changePlan: vi.fn(),
  cancelSubscription: vi.fn(),
  getTenantUsage: vi.fn(),
  getUsageSummary: vi.fn(),
  onboardTenant: vi.fn(),
  checkLimits: vi.fn(),
  updateTenantConfig: vi.fn(),
}));

vi.mock('../../src/shared/stripe.service.js', () => ({
  getStripe: vi.fn(),
  getWebhookSecret: vi.fn(),
  isStripeConfigured: vi.fn(),
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
    vi.mocked(saasService.getPlans).mockResolvedValue([{ id: 1, code: 'free' }]);
    const res = { json: vi.fn() };

    saasController.getPlans({}, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1, code: 'free' }] });
  });
});

describe('saasController.getMySubscription', () => {
  it('returns subscription and plan', async () => {
    vi.mocked(saasService.getTenantSubscription).mockResolvedValue({ id: 1, plan_id: 2 });
    vi.mocked(saasService.getPlanById).mockResolvedValue({ id: 2, code: 'pro' });
    const req = { tenant_id: 'test' };
    const res = { json: vi.fn() };

    saasController.getMySubscription(req, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({ subscription: { id: 1, plan_id: 2 }, plan: { id: 2, code: 'pro' } });
  });

  it('returns null when no subscription', async () => {
    vi.mocked(saasService.getTenantSubscription).mockResolvedValue(null);
    const req = { tenant_id: 'test' };
    const res = { json: vi.fn() };

    saasController.getMySubscription(req, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({ subscription: null, plan: null });
  });
});

describe('saasController.createCheckout', () => {
  it('returns simulated URL when stripe not configured', async () => {
    vi.mocked(saasService.getPlanByCode).mockResolvedValue({ id: 2, code: 'pro', name: 'Pro', description: '', price_monthly: 79 });
    const { isStripeConfigured } = await import('../../src/shared/stripe.service.js');
    vi.mocked(isStripeConfigured).mockReturnValue(false);

    const req = { tenant_id: 'test', user: { email: 'admin@test.com' }, headers: { origin: 'http://localhost:5173' }, body: { plan_code: 'pro' } };
    const res = { json: vi.fn() };

    saasController.createCheckout(req, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({ url: expect.stringContaining('/saas/success'), session_id: 'simulated' });
  });

  it('creates Stripe checkout session', async () => {
    vi.mocked(saasService.getPlanByCode).mockResolvedValue({ id: 2, code: 'pro', name: 'Pro', description: '', price_monthly: 79 });
    const { getStripe, isStripeConfigured } = await import('../../src/shared/stripe.service.js');
    vi.mocked(isStripeConfigured).mockReturnValue(true);
    vi.mocked(getStripe).mockResolvedValue({
      checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://stripe.com/pay', id: 'cs_123' }) } },
    });

    const req = { tenant_id: 'test', user: { email: 'admin@test.com' }, headers: { origin: 'http://localhost:5173' }, body: { plan_code: 'pro' } };
    const res = { json: vi.fn() };

    saasController.createCheckout(req, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({ url: 'https://stripe.com/pay', session_id: 'cs_123' });
  });

  it('returns 400 on Stripe error', async () => {
    vi.mocked(saasService.getPlanByCode).mockResolvedValue({ id: 2, code: 'pro', name: 'Pro', description: '', price_monthly: 79 });
    const { getStripe, isStripeConfigured } = await import('../../src/shared/stripe.service.js');
    vi.mocked(isStripeConfigured).mockReturnValue(true);
    vi.mocked(getStripe).mockResolvedValue({
      checkout: { sessions: { create: vi.fn().mockRejectedValue(new Error('Stripe error')) } },
    });

    const req = { tenant_id: 'test', user: { email: 'admin@test.com' }, headers: { origin: 'http://localhost:5173' }, body: { plan_code: 'pro' } };
    const next = vi.fn();
    const res = { json: vi.fn() };

    saasController.createCheckout(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: expect.stringContaining('Payment gateway error') })
    );
  });
});

describe('saasController.stripeWebhook', () => {
  it('handles checkout.session.completed', async () => {
    const { getStripe, getWebhookSecret } = await import('../../src/shared/stripe.service.js');
    vi.mocked(getWebhookSecret).mockReturnValue('whsec_test');
    vi.mocked(getStripe).mockResolvedValue({
      webhooks: { constructEvent: vi.fn().mockReturnValue({ type: 'checkout.session.completed', data: { object: { client_reference_id: 'tenant-1', subscription: 'sub_1' } } }) },
    });
    vi.mocked(saasService.getTenantSubscription).mockResolvedValue({ id: 1, plan_id: 2 });
    vi.mocked(saasService.getPlanById).mockResolvedValue({ code: 'pro' });

    const req = { headers: { 'stripe-signature': 'sig' }, body: {} };
    const res = { json: vi.fn() };

    saasController.stripeWebhook(req, res, vi.fn());
    await flush();
    expect(saasService.changePlan).toHaveBeenCalledWith('tenant-1', 'pro', 'sub_1');
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('handles customer.subscription.deleted', async () => {
    const { getStripe, getWebhookSecret } = await import('../../src/shared/stripe.service.js');
    vi.mocked(getWebhookSecret).mockReturnValue('whsec_test');
    vi.mocked(getStripe).mockResolvedValue({
      webhooks: { constructEvent: vi.fn().mockReturnValue({ type: 'customer.subscription.deleted', data: { object: { metadata: { tenant_id: 'tenant-1' }, id: 'sub_1' } } }) },
    });

    const req = { headers: { 'stripe-signature': 'sig' }, body: {} };
    const res = { json: vi.fn() };

    saasController.stripeWebhook(req, res, vi.fn());
    await flush();
    expect(saasService.cancelSubscription).toHaveBeenCalledWith('tenant-1');
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('returns 400 on signature error', async () => {
    const { getStripe, getWebhookSecret } = await import('../../src/shared/stripe.service.js');
    vi.mocked(getWebhookSecret).mockReturnValue('whsec_test');
    vi.mocked(getStripe).mockResolvedValue({
      webhooks: { constructEvent: vi.fn().mockImplementation(() => { throw new Error('Invalid signature'); }) },
    });

    const req = { headers: { 'stripe-signature': 'sig' }, body: {} };
    const next = vi.fn();
    const res = { json: vi.fn() };

    saasController.stripeWebhook(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: expect.stringContaining('signature') })
    );
  });
});

describe('saasController.changePlan', () => {
  it('changes plan and returns result', async () => {
    const result = { id: 1, plan_id: 2 };
    vi.mocked(saasService.changePlan).mockResolvedValue(result);
    const req = { tenant_id: 'test', body: { plan_code: 'pro' } };
    const res = { json: vi.fn() };

    saasController.changePlan(req, res, vi.fn());
    await flush();
    expect(saasService.changePlan).toHaveBeenCalledWith('test', 'pro');
    expect(res.json).toHaveBeenCalledWith(result);
  });
});

describe('saasController.cancelSubscription', () => {
  it('cancels and returns message', async () => {
    const req = { tenant_id: 'test' };
    const res = { json: vi.fn() };

    saasController.cancelSubscription(req, res, vi.fn());
    await flush();
    expect(saasService.cancelSubscription).toHaveBeenCalledWith('test');
    expect(res.json).toHaveBeenCalledWith({ message: 'Subscription canceled' });
  });
});

describe('saasController.getUsage', () => {
  it('returns usage for metrics', async () => {
    vi.mocked(saasService.getTenantUsage).mockResolvedValue([{ date: '2026-05-01', value: 10 }]);
    const req = { tenant_id: 'test', query: { days: '7', metrics: 'api_calls,storage' } };
    const res = { json: vi.fn() };

    saasController.getUsage(req, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({
      api_calls: [{ date: '2026-05-01', value: 10 }],
      storage: [{ date: '2026-05-01', value: 10 }],
    });
  });
});

describe('saasController.getUsageSummary', () => {
  it('returns summary', async () => {
    vi.mocked(saasService.getUsageSummary).mockResolvedValue({ api_calls: 150 });
    const req = { tenant_id: 'test' };
    const res = { json: vi.fn() };

    saasController.getUsageSummary(req, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({ api_calls: 150 });
  });
});

describe('saasController.onboardTenant', () => {
  it('creates tenant and returns 201', async () => {
    vi.mocked(saasService.onboardTenant).mockResolvedValue({ tenantId: 'new-tenant' });
    const req = { body: { tenant_name: 'Test Clinic', domain: 'test' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    saasController.onboardTenant(req, res, vi.fn());
    await flush();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ tenantId: 'new-tenant' });
  });
});

describe('saasController.getLimits', () => {
  it('returns doctor, patient, storage limits', async () => {
    vi.mocked(saasService.checkLimits).mockResolvedValue({ allowed: true, current: 5, limit: 10 });
    const req = { tenant_id: 'test' };
    const res = { json: vi.fn() };

    saasController.getLimits(req, res, vi.fn());
    await flush();
    expect(saasService.checkLimits).toHaveBeenCalledTimes(3);
    expect(res.json).toHaveBeenCalledWith({
      doctors: { allowed: true, current: 5, limit: 10 },
      patients: { allowed: true, current: 5, limit: 10 },
      storage: { allowed: true, current: 5, limit: 10 },
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
