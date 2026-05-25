import { logger } from '../utils/logger.js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

const createStub = (): Record<string, unknown> => ({
  checkout: {
    sessions: {
      create: async () => ({ url: '/saas/success', id: 'cs_simulated' }),
    },
  },
  webhooks: {
    constructEvent: () => {
      throw Object.assign(new Error('Stripe not configured'), { type: 'stub_error' });
    },
  },
});

const initStripe = (): Record<string, unknown> => {
  const isConfigured = STRIPE_SECRET_KEY.startsWith('sk_test_') || STRIPE_SECRET_KEY.startsWith('sk_live_');
  if (isConfigured) {
    try {
      const Stripe = require('stripe');
      return new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' as string });
    } catch {
      logger.warn('Stripe package failed to load, using stub');
    }
  }
  logger.info('Stripe in stub mode (no valid key configured)');
  return createStub();
};

export const stripe = initStripe();
export const webhookSecret = STRIPE_WEBHOOK_SECRET;
export const isStripeConfigured = (): boolean => {
  return STRIPE_SECRET_KEY.startsWith('sk_test_') || STRIPE_SECRET_KEY.startsWith('sk_live_');
};
