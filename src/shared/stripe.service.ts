import { logger } from '../utils/logger.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _stripeInstance: any = null;
let _webhookSecret: string | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStub = (): any => ({
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const initStripe = async (): Promise<any> => {
  const { secretKey } = getConfig();
  const isConfigured = secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_');
  if (isConfigured) {
    try {
      const { default: Stripe } = await import('stripe');
      return new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' } as any);
    } catch {
      logger.warn('Stripe package failed to load, using stub');
    }
  }
  logger.info('Stripe in stub mode (no valid key configured)');
  return createStub();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getStripe = async (): Promise<any> => {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stripe: any = createStub();
export const webhookSecret = '';
