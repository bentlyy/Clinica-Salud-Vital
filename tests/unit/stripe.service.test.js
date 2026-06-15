import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe('stripe.service', () => {
  it('getStripe returns stub', async () => {
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

  it('isStripeConfigured returns false', async () => {
    const { isStripeConfigured } = await import('../../src/shared/stripe.service.js');
    expect(isStripeConfigured()).toBe(false);
  });

  it('isStripeConfigured returns false regardless of env', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxxxxxxxxxxxx';
    const { isStripeConfigured } = await import('../../src/shared/stripe.service.js');
    expect(isStripeConfigured()).toBe(false);
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('getWebhookSecret returns empty', async () => {
    const { getWebhookSecret } = await import('../../src/shared/stripe.service.js');
    expect(getWebhookSecret()).toBe('');
  });

  it('has default stub export', async () => {
    const mod = await import('../../src/shared/stripe.service.js');
    expect(mod.stripe).toBeDefined();
    expect(mod.stripe.checkout.sessions.create).toBeDefined();
    expect(mod.webhookSecret).toBe('');
  });

  it('getStripe returns the same instance on subsequent calls', async () => {
    const mod = await import('../../src/shared/stripe.service.js');
    const first = await mod.getStripe();
    const second = await mod.getStripe();
    expect(first).toBe(second);
  });
});
