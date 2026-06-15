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

const _stubInstance = createStub();

export const getStripe = async (): Promise<typeof _stubInstance> => {
  logger.info('Stripe in stub mode');
  return _stubInstance;
};

export const getWebhookSecret = (): string => '';

export const isStripeConfigured = (): boolean => false;

export const stripe = _stubInstance;
export const webhookSecret = '';

export const checkIdempotency = (): boolean => true;
