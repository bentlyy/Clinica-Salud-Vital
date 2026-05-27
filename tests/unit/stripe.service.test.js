import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStripeInstance = vi.hoisted(() => ({ checkout: { sessions: { create: vi.fn() } } }));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('stripe', () => ({
  default: vi.fn(() => mockStripeInstance),
}));

beforeEach(() => {
  vi.resetModules();
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

describe('stripe.service', () => {
  it('getStripe returns stub when no key configured', async () => {
    const { getStripe } = await import('../../src/shared/stripe.service.js');
    const stripe = await getStripe();
    expect(stripe.checkout).toBeDefined();
    const session = await stripe.checkout.sessions.create({});
    expect(session.url).toBe('/saas/success');
    expect(session.id).toBe('cs_simulated');
  });

  it('getStripe stub constructEvent throws', async () => {
    const { getStripe } = await import('../../src/shared/stripe.service.js');
    const stripe = await getStripe();
    expect(() => stripe.webhooks.constructEvent()).toThrow('Stripe not configured');
  });

  it('isStripeConfigured returns false without key', async () => {
    const { isStripeConfigured } = await import('../../src/shared/stripe.service.js');
    expect(isStripeConfigured()).toBe(false);
  });

  it('isStripeConfigured returns true with valid test key', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxxxxxxxxxxxx';
    const { isStripeConfigured } = await import('../../src/shared/stripe.service.js');
    expect(isStripeConfigured()).toBe(true);
  });

  it('isStripeConfigured returns true with valid live key', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_xxxxxxxxxxxxx';
    const { isStripeConfigured } = await import('../../src/shared/stripe.service.js');
    expect(isStripeConfigured()).toBe(true);
  });

  it('isStripeConfigured returns false for invalid format', async () => {
    process.env.STRIPE_SECRET_KEY = 'invalid-key';
    const { isStripeConfigured } = await import('../../src/shared/stripe.service.js');
    expect(isStripeConfigured()).toBe(false);
  });

  it('getWebhookSecret returns configured secret', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    const { getWebhookSecret } = await import('../../src/shared/stripe.service.js');
    expect(getWebhookSecret()).toBe('whsec_test_secret');
  });

  it('getWebhookSecret returns empty if not configured', async () => {
    const { getWebhookSecret } = await import('../../src/shared/stripe.service.js');
    expect(getWebhookSecret()).toBe('');
  });

  it('has default stub export', async () => {
    const mod = await import('../../src/shared/stripe.service.js');
    expect(mod.stripe).toBeDefined();
    expect(mod.stripe.checkout.sessions.create).toBeDefined();
    expect(mod.webhookSecret).toBe('');
  });

  it('initStripe returns Stripe instance when configured with valid key', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_validkey';
    const { getStripe } = await import('../../src/shared/stripe.service.js');
    const stripe = await getStripe();
    expect(stripe.checkout).toBeDefined();
  });

  it('getStripe caches instance on subsequent calls', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_validkey';
    const mod = await import('../../src/shared/stripe.service.js');
    const first = await mod.getStripe();
    const second = await mod.getStripe();
    expect(first).toBe(second);
  });
});
