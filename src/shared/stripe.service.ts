import { logger } from '../utils/logger.js';

const createStub = () => ({
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

let stripeInstance: ReturnType<typeof createStub> | null = null;

export const getStripe = async () => {
  if (!stripeInstance) {
    logger.info('Stripe in stub mode');
    stripeInstance = createStub();
  }
  return stripeInstance;
};

export const isStripeConfigured = (): boolean => {
  return !!process.env.STRIPE_SECRET_KEY;
};

export const getWebhookSecret = (): string => {
  return process.env.STRIPE_WEBHOOK_SECRET || '';
};
