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

  if (process.env.NODE_ENV === 'production' && !isConfigured) {
    throw new Error('Stripe must be configured in production mode. Set STRIPE_SECRET_KEY environment variable.');
  }

  if (isConfigured) {
    try {
      const { default: Stripe } = await import('stripe');
      return new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' } as any);
    } catch {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Stripe package failed to load in production');
      }
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

// Use getStripe() instead of this stub for real Stripe operations
const _defaultExport: any = createStub();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stripe: any = _defaultExport;
export const webhookSecret = '';

// Idempotency store for Stripe webhooks (prevents double processing on retry)
const idempotencyStore = new Map<string, { processed: boolean; timestamp: number }>();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const checkIdempotency = (key: string): boolean => {
  const existing = idempotencyStore.get(key);
  if (existing) {
    logger.warn(`Stripe webhook idempotency hit for key: ${key}`);
    return false; // already processed
  }
  idempotencyStore.set(key, { processed: true, timestamp: Date.now() });
  return true; // new, process it
};

// Periodic cleanup of expired idempotency keys
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of idempotencyStore.entries()) {
    if (now - value.timestamp > IDEMPOTENCY_TTL) {
      idempotencyStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Cleanup every hour
