import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn() },
}));

import { getStripe, isStripeConfigured, getWebhookSecret } from '../../src/shared/stripe.service.js';

beforeEach(() => {
  vi.restoreAllMocks();
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

describe('getStripe', () => {
  it('returns a stripe-like object with checkout sessions create', async () => {
    const stripe = await getStripe();
    const session = await stripe.checkout.sessions.create({ line_items: [] });
    expect(session).toHaveProperty('url');
    expect(session).toHaveProperty('id');
    expect(session.url).toBe('/saas/success');
    expect(session.id).toBe('cs_simulated');
  });

  it('webhooks.constructEvent throws', async () => {
    const stripe = await getStripe();
    expect(() => stripe.webhooks.constructEvent({})).toThrow('Stripe not configured');
  });

  it('returns cached instance on subsequent calls', async () => {
    const first = await getStripe();
    const second = await getStripe();
    expect(first).toBe(second);
  });
});

describe('isStripeConfigured', () => {
  it('returns false when STRIPE_SECRET_KEY is not set', () => {
    expect(isStripeConfigured()).toBe(false);
  });

  it('returns true when STRIPE_SECRET_KEY is set', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    expect(isStripeConfigured()).toBe(true);
  });
});

describe('getWebhookSecret', () => {
  it('returns empty string when not set', () => {
    expect(getWebhookSecret()).toBe('');
  });

  it('returns the webhook secret when set', () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_xxx';
    expect(getWebhookSecret()).toBe('whsec_xxx');
  });
});
