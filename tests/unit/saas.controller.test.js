import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSaasService = vi.hoisted(() => ({
  getPlans: vi.fn(),
  getPlanByCode: vi.fn(),
  getTenantSubscription: vi.fn(),
  getTenantPlan: vi.fn(),
  createSubscription: vi.fn(),
  changePlan: vi.fn(),
  cancelSubscription: vi.fn(),
  getTenantUsage: vi.fn(),
  getUsageSummary: vi.fn(),
  checkLimits: vi.fn(),
  onboardTenant: vi.fn(),
  getTenantFeatures: vi.fn(),
  updateTenantConfig: vi.fn(),
}));

vi.mock('../../src/modules/saas/saas.service.js', () => mockSaasService);

vi.mock('../../src/middlewares/asyncHandler.middleware.js', () => ({
  asyncHandler: (fn) => fn,
}));

vi.mock('../../src/utils/errors.js', () => ({
  BadRequestError: class BadRequestError extends Error {
    constructor(msg) { super(msg); this.name = 'BadRequestError'; }
  },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import * as saasController from '../../src/modules/saas/saas.controller.js';

beforeEach(() => {
  vi.clearAllMocks();
});

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('saasController.getPlans', () => {
  it('returns plans list', async () => {
    const plans = [{ code: 'free', name: 'Free' }];
    mockSaasService.getPlans.mockResolvedValue(plans);
    const res = mockRes();

    await saasController.getPlans({}, res);

    expect(res.json).toHaveBeenCalledWith({ data: plans });
  });
});

describe('saasController.getMySubscription', () => {
  it('returns subscription and plan', async () => {
    mockSaasService.getTenantSubscription.mockResolvedValue({ id: 1, plan: { code: 'pro' } });
    mockSaasService.getTenantPlan.mockResolvedValue({ code: 'pro', name: 'Pro' });
    const req = { tenant_id: 'tenant-1' };
    const res = mockRes();

    await saasController.getMySubscription(req, res);

    expect(mockSaasService.getTenantSubscription).toHaveBeenCalledWith('tenant-1');
    expect(mockSaasService.getTenantPlan).toHaveBeenCalledWith('tenant-1');
    expect(res.json).toHaveBeenCalledWith({
      subscription: { id: 1, plan: { code: 'pro' } },
      plan: { code: 'pro', name: 'Pro' },
    });
  });
});

describe('saasController.createCheckout', () => {
  it('creates subscription and returns checkout info', async () => {
    mockSaasService.getPlanByCode.mockResolvedValue({ id: 1, code: 'pro' });
    mockSaasService.createSubscription.mockResolvedValue({ id: 1, status: 'active', plan: { code: 'pro' } });
    const req = { body: { plan_code: 'pro' }, tenant_id: 'tenant-1' };
    const res = mockRes();

    await saasController.createCheckout(req, res);

    expect(mockSaasService.getPlanByCode).toHaveBeenCalledWith('pro');
    expect(mockSaasService.createSubscription).toHaveBeenCalledWith('tenant-1', 'pro');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      subscription: { id: 1, status: 'active', plan: { code: 'pro' } },
      url: '/saas/success?plan=pro&tenant=tenant-1',
      message: "Subscription created for plan 'pro'",
    });
  });
});

describe('saasController.stripeWebhook', () => {
  it('returns received true', async () => {
    const res = mockRes();

    await saasController.stripeWebhook({}, res);

    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});

describe('saasController.changePlan', () => {
  it('changes plan', async () => {
    mockSaasService.changePlan.mockResolvedValue({
      subscription: { id: 1, plan: { code: 'enterprise' } },
      message: "Plan changed from 'pro' to 'enterprise'",
    });
    const req = { body: { plan_code: 'enterprise' }, tenant_id: 'tenant-1' };
    const res = mockRes();

    await saasController.changePlan(req, res);

    expect(mockSaasService.changePlan).toHaveBeenCalledWith('tenant-1', 'enterprise');
    expect(res.json).toHaveBeenCalledWith({
      subscription: { id: 1, plan: { code: 'enterprise' } },
      message: "Plan changed from 'pro' to 'enterprise'",
    });
  });
});

describe('saasController.cancelSubscription', () => {
  it('cancels subscription', async () => {
    mockSaasService.cancelSubscription.mockResolvedValue({ message: 'Subscription canceled. Access continues until end of current period.' });
    const req = { tenant_id: 'tenant-1' };
    const res = mockRes();

    await saasController.cancelSubscription(req, res);

    expect(mockSaasService.cancelSubscription).toHaveBeenCalledWith('tenant-1');
    expect(res.json).toHaveBeenCalledWith({ message: 'Subscription canceled. Access continues until end of current period.' });
  });
});

describe('saasController.getUsage', () => {
  it('returns tenant usage', async () => {
    mockSaasService.getTenantUsage.mockResolvedValue([{ date: '2026-01-01', metric_key: 'doctors', value: 2 }]);
    const req = { tenant_id: 'tenant-1' };
    const res = mockRes();

    await saasController.getUsage(req, res);

    expect(mockSaasService.getTenantUsage).toHaveBeenCalledWith('tenant-1');
    expect(res.json).toHaveBeenCalledWith({ usage: [{ date: '2026-01-01', metric_key: 'doctors', value: 2 }] });
  });
});

describe('saasController.getUsageSummary', () => {
  it('returns usage summary', async () => {
    mockSaasService.getUsageSummary.mockResolvedValue({ doctors: 3, patients: 50 });
    const req = { tenant_id: 'tenant-1' };
    const res = mockRes();

    await saasController.getUsageSummary(req, res);

    expect(mockSaasService.getUsageSummary).toHaveBeenCalledWith('tenant-1');
    expect(res.json).toHaveBeenCalledWith({ summary: { doctors: 3, patients: 50 } });
  });
});

describe('saasController.onboardTenant', () => {
  const validBody = {
    captcha_token: 'valid-token',
    tenant_name: 'New Clinic',
    domain: 'new-clinic',
    admin_email: 'admin@new.com',
    admin_password: 'Pass1234!',
    admin_name: 'Admin',
    locale: 'es',
    timezone: 'America/Santiago',
    plan_code: 'pro',
  };

  it('onboards a new tenant', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);
    mockSaasService.onboardTenant.mockResolvedValue({ tenantId: 'new-clinic', message: "Tenant created with plan 'pro'" });
    const req = { body: validBody };
    const res = mockRes();

    await saasController.onboardTenant(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ tenantId: 'new-clinic', message: "Tenant created with plan 'pro'" });
    expect(mockSaasService.onboardTenant).toHaveBeenCalledWith({
      tenantName: 'New Clinic',
      domain: 'new-clinic',
      adminEmail: 'admin@new.com',
      adminPassword: 'Pass1234!',
      adminName: 'Admin',
      locale: 'es',
      timezone: 'America/Santiago',
      planCode: 'pro',
    });
    vi.unstubAllGlobals();
  });

  it('throws on CAPTCHA failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ success: false }) });
    vi.stubGlobal('fetch', fetchMock);
    const req = { body: validBody };

    await expect(saasController.onboardTenant(req, {})).rejects.toThrow('CAPTCHA verification failed');
    vi.unstubAllGlobals();
  });

  it('skips CAPTCHA when RECAPTCHA_SECRET_KEY missing', async () => {
    vi.stubGlobal('fetch', vi.fn());
    delete process.env.RECAPTCHA_SECRET_KEY;
    mockSaasService.onboardTenant.mockResolvedValue({ tenantId: 'new-clinic', message: 'Tenant created (no plan assigned)' });
    const req = { body: validBody };
    const res = mockRes();

    await saasController.onboardTenant(req, res);

    expect(fetch).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    vi.unstubAllGlobals();
  });

  it('handles fetch error gracefully', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'secret';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const req = { body: validBody };

    await expect(saasController.onboardTenant(req, {})).rejects.toThrow('CAPTCHA verification failed');
    vi.unstubAllGlobals();
  });
});

describe('saasController.getLimits', () => {
  it('returns real limits from service', async () => {
    mockSaasService.checkLimits
      .mockResolvedValueOnce({ allowed: true, current: 2, limit: 10 })
      .mockResolvedValueOnce({ allowed: true, current: 50, limit: 200 })
      .mockResolvedValueOnce({ allowed: true, current: 1, limit: 5 });
    const req = { tenant_id: 'tenant-1' };
    const res = mockRes();

    await saasController.getLimits(req, res);

    expect(mockSaasService.checkLimits).toHaveBeenCalledTimes(3);
    expect(res.json).toHaveBeenCalledWith({
      doctors: { allowed: true, current: 2, limit: 10 },
      patients: { allowed: true, current: 50, limit: 200 },
      storage: { allowed: true, current: 1, limit: 5 },
    });
  });
});

describe('saasController.getFeatures', () => {
  it('returns tenant features', async () => {
    mockSaasService.getTenantFeatures.mockResolvedValue({ bookings: true, laboratory: false });
    const req = { tenant_id: 'tenant-1' };
    const res = mockRes();

    await saasController.getFeatures(req, res);

    expect(res.json).toHaveBeenCalledWith({ features: { bookings: true, laboratory: false } });
    expect(mockSaasService.getTenantFeatures).toHaveBeenCalledWith('tenant-1');
  });
});

describe('saasController.updateTenantConfig', () => {
  it('updates allowed fields', async () => {
    mockSaasService.updateTenantConfig.mockResolvedValue();
    const req = {
      tenant_id: 'tenant-1',
      body: { name: 'New Name', locale: 'en', timezone: 'UTC', config: { theme: 'dark' } },
    };
    const res = mockRes();

    await saasController.updateTenantConfig(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Configuration updated' });
    expect(mockSaasService.updateTenantConfig).toHaveBeenCalledWith('tenant-1', {
      name: 'New Name', locale: 'en', timezone: 'UTC', config: { theme: 'dark' },
    });
  });

  it('ignores non-allowed fields', async () => {
    mockSaasService.updateTenantConfig.mockResolvedValue();
    const req = {
      tenant_id: 'tenant-1',
      body: { name: 'Valid', secret_field: 'should be ignored' },
    };
    const res = mockRes();

    await saasController.updateTenantConfig(req, res);

    expect(mockSaasService.updateTenantConfig).toHaveBeenCalledWith('tenant-1', { name: 'Valid' });
  });

  it('throws when no valid fields', async () => {
    const req = { tenant_id: 'tenant-1', body: { invalid_field: 'x' } };

    await expect(saasController.updateTenantConfig(req, {})).rejects.toThrow('No valid fields to update');
  });
});
