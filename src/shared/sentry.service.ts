import * as Sentry from '@sentry/node';
import { expressIntegration } from '@sentry/node';
import type { Express } from 'express';

export const initSentry = (app: Express): void => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    maxBreadcrumbs: 50,
    debug: false,
    integrations: [expressIntegration()],
  });
};

export { setupExpressErrorHandler } from '@sentry/node';

export default Sentry;
