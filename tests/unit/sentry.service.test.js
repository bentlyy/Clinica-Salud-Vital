import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sentry/node', () => {
  const init = vi.fn();
  return {
    init,
    expressIntegration: vi.fn(() => ({ name: 'Express' })),
    setupExpressErrorHandler: vi.fn(),
    default: { init },
  };
});

import { initSentry, setupExpressErrorHandler } from '../../src/shared/sentry.service.js';
import * as Sentry from '@sentry/node';

const OLD_ENV = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...OLD_ENV };
  delete process.env.SENTRY_DSN;
  delete process.env.SENTRY_TRACES_SAMPLE_RATE;
});

describe('sentry.service', () => {
  it('does nothing when SENTRY_DSN is not set', () => {
    initSentry({});
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('initializes Sentry with the configured DSN and sample rate', () => {
    process.env.SENTRY_DSN = 'https://fake@sentry.example/1';
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.5';
    initSentry({});
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({
      dsn: 'https://fake@sentry.example/1',
      tracesSampleRate: 0.5,
    }));
  });

  it('falls back to a 0.1 sample rate when not configured', () => {
    process.env.SENTRY_DSN = 'https://fake@sentry.example/1';
    initSentry({});
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV || 'development',
    }));
  });

  it('re-exports setupExpressErrorHandler', () => {
    expect(typeof setupExpressErrorHandler).toBe('function');
  });
});
