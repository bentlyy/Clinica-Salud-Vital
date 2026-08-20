import crypto from 'crypto';
import { pool } from '../../shared/db.js';
import { BadRequestError, NotFoundError, toError } from '../../utils/errors.js';
import { enqueueJob, registerWorker } from '../../shared/queue.service.js';
import { logger } from '../../utils/logger.js';
import { WEBHOOK_EVENTS } from './webhooks.schema.js';

export interface WebhookSubscription {
  id: number;
  tenant_id: string;
  url: string;
  events: string[];
  active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export type WebhookSubscriptionWithSecret = WebhookSubscription & { secret: string };

const SUBSCRIPTION_COLUMNS = 'id, tenant_id, url, events, active, created_by, created_at, updated_at';

const parseSubscription = (row: Record<string, unknown>): WebhookSubscription => ({
  id: row.id as number,
  tenant_id: row.tenant_id as string,
  url: row.url as string,
  events: Array.isArray(row.events) ? (row.events as string[]) : [],
  active: row.active as boolean,
  created_by: (row.created_by as number | null) ?? null,
  created_at: row.created_at as string,
  updated_at: row.updated_at as string,
});

const isWebhookEvent = (value: string): boolean => (WEBHOOK_EVENTS as readonly string[]).includes(value);

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^localhost$/i,
  /^::1$/,
  /^\[::1\]$/,
];

const assertValidUrl = (url: string): void => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestError('Invalid url');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestError('url must use http or https');
  }

  const hostname = parsed.hostname;
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new BadRequestError('url must not point to private/internal addresses (SSRF protection)');
    }
  }
};

const assertValidEvents = (events: string[]): void => {
  if (!events || events.length === 0) throw new BadRequestError('events must not be empty');
  for (const event of events) {
    if (!isWebhookEvent(event)) throw new BadRequestError(`Invalid event: ${event}`);
  }
};

export const listSubscriptions = async (tenantId: string): Promise<WebhookSubscription[]> => {
  const result = await pool.query(
    `SELECT ${SUBSCRIPTION_COLUMNS} FROM webhook_subscriptions WHERE tenant_id = $1 ORDER BY id ASC`,
    [tenantId]
  );
  return result.rows.map(parseSubscription);
};

export const createSubscription = async (
  tenantId: string,
  userId: number,
  payload: { url: string; events: string[]; secret?: string },
): Promise<WebhookSubscriptionWithSecret> => {
  const { url, events, secret: providedSecret } = payload;

  assertValidUrl(url);
  assertValidEvents(events);

  const secret = providedSecret || crypto.randomBytes(32).toString('hex');

  const result = await pool.query(
    `INSERT INTO webhook_subscriptions (tenant_id, url, secret, events, active, created_by)
     VALUES ($1, $2, $3, $4, TRUE, $5)
     RETURNING ${SUBSCRIPTION_COLUMNS}`,
    [tenantId, url, secret, events, userId]
  );

  return { ...parseSubscription(result.rows[0]), secret };
};

export const updateSubscription = async (
  id: number,
  tenantId: string,
  payload: { url?: string; events?: string[]; active?: boolean },
): Promise<WebhookSubscription> => {
  const existing = await pool.query(
    'SELECT url, events, active FROM webhook_subscriptions WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  if (existing.rows.length === 0) throw new NotFoundError('Webhook subscription not found');

  const current = existing.rows[0];
  const url = payload.url ?? current.url;
  const events = payload.events ?? current.events;
  const active = payload.active ?? current.active;

  if (payload.url !== undefined) assertValidUrl(payload.url);
  if (payload.events !== undefined) assertValidEvents(payload.events);

  const result = await pool.query(
    `UPDATE webhook_subscriptions
     SET url = $1, events = $2, active = $3, updated_at = NOW()
     WHERE id = $4 AND tenant_id = $5
     RETURNING ${SUBSCRIPTION_COLUMNS}`,
    [url, events, active, id, tenantId]
  );

  return parseSubscription(result.rows[0]);
};

export const deleteSubscription = async (id: number, tenantId: string): Promise<void> => {
  const result = await pool.query(
    'DELETE FROM webhook_subscriptions WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [id, tenantId]
  );
  if (result.rowCount === 0) throw new NotFoundError('Webhook subscription not found');
};

export const dispatchEvent = async (event: string, payload: unknown, tenantId: string): Promise<number> => {
  const result = await pool.query(
    `SELECT id, url, secret
     FROM webhook_subscriptions
     WHERE tenant_id = $1 AND active = TRUE AND $2 = ANY(events)`,
    [tenantId, event]
  );

  for (const row of result.rows) {
    await enqueueJob('webhook:dispatch', {
      subscriptionId: row.id as number,
      url: row.url as string,
      secret: row.secret as string,
      event,
      payload,
      tenantId,
    });
  }

  return result.rows.length;
};

export const dispatchWebhook = async (
  subscriptionId: number,
  url: string,
  secret: string,
  event: string,
  payload: unknown,
): Promise<void> => {
  const timestamp = new Date().toISOString();
  const body = JSON.stringify({ event, payload, timestamp });
  const signaturePayload = `${timestamp}.${JSON.stringify({ event, payload })}`;
  const signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': event,
        'X-Webhook-Timestamp': timestamp,
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: HTTP ${response.status}`);
    }

    logger.info(`Webhook delivered: ${event} -> ${url} (subscription ${subscriptionId})`);
  } catch (err) {
    logger.error(`Webhook delivery failed: ${event} -> ${url} (subscription ${subscriptionId})`, {
      error: toError(err).message,
    });
    throw err;
  }
};

export function registerWebhookWorker(): void {
  registerWorker('webhook:dispatch', async (job) => {
    const { subscriptionId, url, secret, event, payload } = job.data as {
      subscriptionId: number;
      url: string;
      secret: string;
      event: string;
      payload: unknown;
    };
    await dispatchWebhook(subscriptionId, url, secret, event, payload);
  });
}
