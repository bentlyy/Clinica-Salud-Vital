import * as Sentry from '@sentry/node';
import { expressIntegration } from '@sentry/node';
import type { Express } from 'express';
import { logger } from '../utils/logger.js';

export const initSentry = (app: Express): void => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  const parsedRate = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1');
  const tracesSampleRate = Number.isFinite(parsedRate) ? Math.min(Math.max(parsedRate, 0), 1) : 0.1;

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || process.env.RENDER_DEPLOY_ID || undefined,
      tracesSampleRate,
      maxBreadcrumbs: 50,
      debug: false,
      sendDefaultPii: false,
      integrations: [expressIntegration()],
    });
    logger.info(`Sentry inicializado (env=${process.env.NODE_ENV || 'development'}, rate=${tracesSampleRate})`);
  } catch (err) {
    // Un DSN inválido o un error de red no debe tumbar el arranque del servidor.
    logger.warn('Sentry init falló (no-fatal):', { error: (err as Error).message });
  }
};

export const setupExpressErrorHandler = (app: Express): void => {
  if (!process.env.SENTRY_DSN) return;
  try {
    Sentry.setupExpressErrorHandler(app);
  } catch {
    // No-fatal
  }
};

export default Sentry;