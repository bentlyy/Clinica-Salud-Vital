import { logger } from '../utils/logger.js';
import pkg from '../../package.json';

const ALERT_COOLDOWN_MS = 60_000;
const lastNotified = new Map<string, number>();

export interface CriticalAlert {
  title: string;
  message: string;
  meta?: Record<string, unknown>;
}

export const notifyCritical = (alert: CriticalAlert): void => {
  const key = `${alert.title}|${alert.message}`;
  const now = Date.now();
  const last = lastNotified.get(key) ?? 0;
  if (now - last < ALERT_COOLDOWN_MS) return;
  lastNotified.set(key, now);

  const payload = {
    title: alert.title,
    message: alert.message,
    meta: alert.meta ?? {},
    service: 'vitaria-backend',
    environment: process.env.NODE_ENV || 'development',
    version: pkg.version,
    timestamp: new Date().toISOString(),
  };

  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.error(`[ALERT] ${alert.title}`, payload);
    return;
  }

  logger.error(`[ALERT] ${alert.title} (webhook)`, payload);
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  }).catch((err: unknown) => {
    logger.warn('[ALERT] Webhook delivery failed', { error: (err as Error).message, url: webhookUrl });
  });
};