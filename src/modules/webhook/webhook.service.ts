import { pool } from '../../shared/db.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';

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

export const dispatchEvent = async (event: string, payload: Record<string, unknown>): Promise<void> => {
  const webhooks = await pool.query(
    'SELECT * FROM webhooks WHERE active = true AND events @> $1',
    [JSON.stringify([event])]
  );

  for (const webhook of webhooks.rows) {
    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(body)
      .digest('hex');

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
        },
        body,
      });

      await pool.query(
        `INSERT INTO webhook_deliveries (webhook_id, event, status, status_code, response_body)
         VALUES ($1, $2, $3, $4, $5)`,
        [webhook.id, event, response.ok ? 'delivered' : 'failed', response.status, await response.text().catch(() => '')]
      );
    } catch (err) {
      logger.error(`Webhook delivery failed`, { webhookId: webhook.id, event, error: (err as Error).message });
      await pool.query(
        `INSERT INTO webhook_deliveries (webhook_id, event, status, error)
         VALUES ($1, $2, 'failed', $3)`,
        [webhook.id, event, (err as Error).message]
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
