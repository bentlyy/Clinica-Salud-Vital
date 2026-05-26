import { pool } from '../../shared/db.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';
import { URL } from 'url';

interface Webhook {
  id: number;
  name: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  created_at: Date;
}

export const createWebhook = async (data: {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  active?: boolean;
}): Promise<Webhook> => {
  const secret = data.secret || crypto.randomBytes(32).toString('hex');
  const result = await pool.query(
    `INSERT INTO webhooks (name, url, events, secret, active)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.name, data.url, JSON.stringify(data.events), secret, data.active ?? true]
  );
  return result.rows[0];
};

export const getWebhooks = async (activeOnly = false): Promise<Webhook[]> => {
  let query = 'SELECT * FROM webhooks';
  if (activeOnly) query += ' WHERE active = true';
  query += ' ORDER BY created_at DESC';
  const result = await pool.query(query);
  return result.rows;
};

export const getWebhookById = async (id: number): Promise<Webhook | null> => {
  const result = await pool.query('SELECT * FROM webhooks WHERE id = $1', [id]);
  return result.rows[0] || null;
};

export const updateWebhook = async (id: number, data: Partial<{
  name: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
}>): Promise<Webhook | null> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(data.name); }
  if (data.url !== undefined) { fields.push(`url = $${paramIndex++}`); values.push(data.url); }
  if (data.events !== undefined) { fields.push(`events = $${paramIndex++}`); values.push(JSON.stringify(data.events)); }
  if (data.secret !== undefined) { fields.push(`secret = $${paramIndex++}`); values.push(data.secret); }
  if (data.active !== undefined) { fields.push(`active = $${paramIndex++}`); values.push(data.active); }

  if (fields.length === 0) return getWebhookById(id);

  values.push(id);
  const result = await pool.query(
    `UPDATE webhooks SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
};

export const deleteWebhook = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM webhooks WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

export const isInternalHost = (urlStr: string): boolean => {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return true;
    if (host.startsWith('10.') || host.startsWith('172.16.') || host.startsWith('192.168.')) return true;
    if (host.endsWith('.local') || host.endsWith('.internal')) return true;
    return false;
  } catch {
    return true;
  }
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export const dispatchEvent = async (event: string, payload: Record<string, unknown>): Promise<void> => {
  const webhooks = await pool.query(
    'SELECT * FROM webhooks WHERE active = true AND events @> $1',
    [JSON.stringify([event])]
  );

  for (const webhook of webhooks.rows) {
    if (isInternalHost(webhook.url)) {
      logger.error(`Webhook blocked: internal URL not allowed`, { webhookId: webhook.id, url: webhook.url });
      await pool.query(
        `INSERT INTO webhook_deliveries (webhook_id, event, status, error)
         VALUES ($1, $2, 'failed', $3)`,
        [webhook.id, event, 'Blocked: internal URLs not allowed for security']
      );
      continue;
    }

    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(body)
      .digest('hex');

    let lastError: string = '';
    let success = false;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
          },
          body,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        await pool.query(
          `INSERT INTO webhook_deliveries (webhook_id, event, status, status_code, response_body)
           VALUES ($1, $2, $3, $4, $5)`,
          [webhook.id, event, response.ok ? 'delivered' : 'failed', response.status, await response.text().catch(() => '')]
        );

        if (response.ok) {
          success = true;
          break;
        }
        lastError = `HTTP ${response.status}`;
      } catch (err) {
        lastError = (err as Error).message;
        logger.warn(`Webhook delivery attempt ${attempt}/${MAX_RETRIES} failed`, { webhookId: webhook.id, event, error: lastError });
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt);
        }
      }
    }

    if (!success) {
      logger.error(`Webhook delivery failed after ${MAX_RETRIES} retries`, { webhookId: webhook.id, event, error: lastError });
      await pool.query(
        `INSERT INTO webhook_deliveries (webhook_id, event, status, error)
         VALUES ($1, $2, 'failed', $3)`,
        [webhook.id, event, lastError]
      );
    }
  }
};

export const getDeliveries = async (webhookId?: number, limit = 50): Promise<unknown[]> => {
  let query = 'SELECT * FROM webhook_deliveries';
  const values: unknown[] = [];
  if (webhookId) {
    query += ' WHERE webhook_id = $1';
    values.push(webhookId);
  }
  query += ' ORDER BY created_at DESC LIMIT $' + (values.length + 1);
  values.push(limit);
  const result = await pool.query(query, values);
  return result.rows;
};
