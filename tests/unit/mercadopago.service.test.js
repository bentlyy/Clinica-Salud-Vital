import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import {
  createCheckoutPreference,
  fetchPayment,
  isMercadoPagoConfigured,
  getAccessToken,
} from '../../src/shared/mercadopago.service.js';

beforeEach(() => {
  vi.restoreAllMocks();
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  delete process.env.MERCADOPAGO_NOTIFICATION_URL;
});

describe('isMercadoPagoConfigured', () => {
  it('returns false when MERCADOPAGO_ACCESS_TOKEN is not set', () => {
    expect(isMercadoPagoConfigured()).toBe(false);
  });

  it('returns true when MERCADOPAGO_ACCESS_TOKEN is set', () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-123';
    expect(isMercadoPagoConfigured()).toBe(true);
  });
});

describe('getAccessToken', () => {
  it('returns the configured token', () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'APP_USR-abc';
    expect(getAccessToken()).toBe('APP_USR-abc');
  });
});

describe('createCheckoutPreference', () => {
  const params = {
    tenantId: 't1',
    planCode: 'pro',
    planName: 'Pro',
    currency: 'CLP',
    unitPrice: 19990,
    returnUrl: 'https://app.vitaria.com',
  };

  it('returns a simulated preference when Mercado Pago is not configured', async () => {
    const pref = await createCheckoutPreference(params);

    expect(pref.id).toBe('pref_simulated_pro');
    expect(pref.init_point).toContain('/saas/success?plan=pro');
    expect(pref.sandbox_init_point).toBe('');
  });

  it('calls the Mercado Pago API when the access token is set', async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-123';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1', init_point: 'https://www.mercadopago.cl/checkout/v1/redirect?pref_id=1', sandbox_init_point: '' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const pref = await createCheckoutPreference(params);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.mercadopago.com/checkout/preferences');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer TEST-123');
    const body = JSON.parse(init.body);
    expect(body.items[0].unit_price).toBe(19990);
    expect(body.items[0].currency_id).toBe('CLP');
    expect(body.external_reference).toBe('t1');
    expect(body.metadata.plan_code).toBe('pro');
    expect(body.notification_url).toBe('https://app.vitaria.com/api/saas/webhook/mercadopago');
    expect(pref.id).toBe('1');
  });

  it('throws when the API returns an error', async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-123';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Invalid access token' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(createCheckoutPreference(params)).rejects.toThrow('Invalid access token');
  });

  it('supports an explicit notification URL via env', async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-123';
    process.env.MERCADOPAGO_NOTIFICATION_URL = 'https://hooks.example.com/mp';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1', init_point: 'https://checkout', sandbox_init_point: '' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await createCheckoutPreference(params);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.notification_url).toBe('https://hooks.example.com/mp');
  });
});

describe('fetchPayment', () => {
  it('calls GET /v1/payments/{id} and returns the payment', async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-123';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '12345', status: 'approved', external_reference: 't1', metadata: { plan_code: 'pro' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const payment = await fetchPayment('12345');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.mercadopago.com/v1/payments/12345');
    expect(init.headers.Authorization).toBe('Bearer TEST-123');
    expect(payment.status).toBe('approved');
  });

  it('throws when the payment cannot be resolved', async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-123';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'payment not found' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(fetchPayment('999')).rejects.toThrow('payment not found');
  });

  it('throws PAYMENT_NOT_FOUND on HTTP 404', async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-123';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: 'payment not found' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(fetchPayment('999999999')).rejects.toMatchObject({ code: 'PAYMENT_NOT_FOUND' });
  });
});