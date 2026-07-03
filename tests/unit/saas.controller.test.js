import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSaasService = vi.hoisted(() => ({
  getPlans: vi.fn(),
  getTenantPlan: vi.fn(),
  changePlan: vi.fn(),
  cancelSubscription: vi.fn(),
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
    mockSaasService.getTenantPlan.mockResolvedValue({ code: 'free', name: 'Free' });
    const res = mockRes();

    await saasController.getMySubscription({}, res);

    expect(res.json).toHaveBeenCalledWith({
      subscription: null,
      plan: { code: 'free', name: 'Free' },
    });
  });
});

describe('saasController.createCheckout', () => {
  it('returns checkout URL', async () => {
    const res = mockRes();
    const req = { body: { plan_code: 'pro' }, tenant_id: 'tenant-1' };

    await saasController.createCheckout(req, res);

    expect(res.json).toHaveBeenCalledWith({
      url: '/saas/success?plan=pro&tenant=tenant-1',
      session_id: 'simulated',
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
    mockSaasService.changePlan.mockResolvedValue({ plan_code: 'pro', message: 'Changed' });
    const res = mockRes();

    await saasController.changePlan({}, res);

    expect(res.json).toHaveBeenCalledWith({ plan_code: 'pro', message: 'Changed' });
  });
});

describe('saasController.cancelSubscription', () => {
  it('cancels subscription', async () => {
    mockSaasService.cancelSubscription.mockResolvedValue();
    const res = mockRes();

    await saasController.cancelSubscription({}, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Subscription canceled' });
  });
});

describe('saasController.getUsage', () => {
  it('returns empty object', async () => {
    const res = mockRes();

    await saasController.getUsage({}, res);

    expect(res.json).toHaveBeenCalledWith({});
  });
});

describe('saasController.getUsageSummary', () => {
  it('returns empty object', async () => {
    const res = mockRes();

    await saasController.getUsageSummary({}, res);

    expect(res.json).toHaveBeenCalledWith({});
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
    mockSaasService.onboardTenant.mockResolvedValue({ tenantId: 'new-clinic', message: 'Tenant created successfully.' });
    const req = { body: validBody };
    const res = mockRes();

    await saasController.onboardTenant(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ tenantId: 'new-clinic', message: 'Tenant created successfully.' });
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
    mockSaasService.onboardTenant.mockResolvedValue({ tenantId: 'new-clinic', message: 'Tenant created successfully.' });
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
  it('returns default limits', async () => {
    const res = mockRes();

    await saasController.getLimits({}, res);

    expect(res.json).toHaveBeenCalledWith({
      doctors: { allowed: true, current: 0, limit: -1 },
      patients: { allowed: true, current: 0, limit: -1 },
      storage: { allowed: true, current: 0, limit: -1 },
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
