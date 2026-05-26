import { logger } from '../utils/logger.js';

let _stripeInstance: Record<string, unknown> | null = null;
let _webhookSecret: string | null = null;

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

const getConfig = () => ({
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
});

const initStripe = async (): Promise<Record<string, unknown>> => {
  const { secretKey } = getConfig();
  const isConfigured = secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_');
  if (isConfigured) {
    try {
      const { default: Stripe } = await import('stripe');
      return new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' as string });
    } catch {
      logger.warn('Stripe package failed to load, using stub');
    }
  }
  logger.info('Stripe in stub mode (no valid key configured)');
  return createStub();
};

export const getStripe = async (): Promise<Record<string, unknown>> => {
  if (!_stripeInstance) _stripeInstance = await initStripe();
  return _stripeInstance;
};

export const getWebhookSecret = (): string => {
  if (!_webhookSecret) {
    const { webhookSecret: ws } = getConfig();
    _webhookSecret = ws;
  }
  return _webhookSecret;
};

export const isStripeConfigured = (): boolean => {
  const { secretKey } = getConfig();
  return secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_');
};

export const stripe = createStub() as Record<string, unknown>;
export const webhookSecret = '';
