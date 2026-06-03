import { pool } from '../../shared/db.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';
import { URL } from 'url';

export interface Webhook {
  id: number;
  name: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  created_at: Date;
}

const maskSecret = (secret: string): string => {
  if (secret.length <= 8) return '****';
  return secret.slice(0, 4) + '****' + secret.slice(-4);
};

const maskWebhookSecret = (wh: Webhook): Webhook => {
  if (wh.secret) wh.secret = maskSecret(wh.secret);
  return wh;
};

export const createWebhook = async (data: {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  active?: boolean;
  tenant_id?: string;
}): Promise<Webhook> => {
  const secret = data.secret || crypto.randomBytes(32).toString('hex');
  const result = await pool.query(
    `INSERT INTO webhooks (name, url, events, secret, active, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.name, data.url, JSON.stringify(data.events), secret, data.active ?? true, data.tenant_id || 'default']
  );
  return result.rows[0];
};

export const getWebhooks = async (activeOnly = false, tenantId?: string): Promise<Webhook[]> => {
  const params: (string | boolean)[] = [];
  let paramIdx = 1;
  let query = 'SELECT * FROM webhooks WHERE 1=1';
  if (activeOnly) { query += ` AND active = $${paramIdx++}`; params.push(true); }
  if (tenantId) { query += ` AND tenant_id = $${paramIdx++}`; params.push(tenantId); }
  query += ' ORDER BY created_at DESC';
  const result = await pool.query(query, params);
  return result.rows.map(maskWebhookSecret);
};

export const getWebhookById = async (id: number, tenantId?: string): Promise<Webhook | null> => {
  const result = await pool.query(`SELECT * FROM webhooks WHERE id = $1${tenantId ? ' AND tenant_id = $2' : ''}`, tenantId ? [id, tenantId] : [id]);
  if (!result.rows[0]) return null;
  return maskWebhookSecret(result.rows[0]);
};

export const updateWebhook = async (id: number, data: Partial<{
  name: string;
  url: string;
  events: string[];
  active: boolean;
}>, tenantId?: string): Promise<Webhook | null> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(data.name); }
  if (data.url !== undefined) { fields.push(`url = $${paramIndex++}`); values.push(data.url); }
  if (data.events !== undefined) { fields.push(`events = $${paramIndex++}`); values.push(JSON.stringify(data.events)); }
  if (data.active !== undefined) { fields.push(`active = $${paramIndex++}`); values.push(data.active); }

  if (fields.length === 0) return getWebhookById(id, tenantId);

  values.push(id, tenantId);
  const result = await pool.query(
    `UPDATE webhooks SET ${fields.join(', ')} WHERE id = $${paramIndex}${tenantId ? ` AND tenant_id = $${paramIndex + 1}` : ''} RETURNING *`,
    values
  );
  if (!result.rows[0]) return null;
  return maskWebhookSecret(result.rows[0]);
};

export const deleteWebhook = async (id: number, tenantId?: string): Promise<boolean> => {
  const result = await pool.query(`DELETE FROM webhooks WHERE id = $1${tenantId ? ' AND tenant_id = $2' : ''}`, tenantId ? [id, tenantId] : [id]);
  return (result.rowCount ?? 0) > 0;
};

import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

const PRIVATE_IP_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' },
  { start: '169.254.0.0', end: '169.254.255.255' },
  { start: '0.0.0.0', end: '0.255.255.255' },
];

const ipToInt = (ip: string): number => {
  const parts = ip.split('.');
  return ((+parts[0] << 24) + (+parts[1] << 16) + (+parts[2] << 8) + (+parts[3])) >>> 0;
};

const isPrivateIP = (ip: string): boolean => {
  const ipInt = ipToInt(ip);
  return PRIVATE_IP_RANGES.some(({ start, end }) => ipInt >= ipToInt(start) && ipInt <= ipToInt(end));
};

export const isInternalHost = async (urlStr: string): Promise<boolean> => {
  try {
    const parsed = new URL(urlStr);

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return true;
    }

    if (parsed.hostname.includes('@')) {
      return true;
    }

    const host = parsed.hostname.toLowerCase();

    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1' || host === '[::1]') return true;
    if (host.startsWith('10.') || host.startsWith('172.16.') || host.startsWith('192.168.')) return true;
    if (host.endsWith('.local') || host.endsWith('.internal')) return true;

    try {
      const { address } = await dnsLookup(host);
      if (isPrivateIP(address)) {
        logger.error(`Webhook blocked via DNS resolve: ${host} -> ${address}`);
        return true;
      }
    } catch {
      logger.warn(`Webhook DNS lookup failed for ${host}, blocking`);
      return true;
    }

    return false;
  } catch {
    return true;
  }
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export const dispatchEvent = async (event: string, payload: Record<string, unknown>, tenantId?: string): Promise<void> => {
  const webhooks = await pool.query(
    `SELECT * FROM webhooks WHERE active = true AND events @> $1${tenantId ? ' AND tenant_id = $2' : ''}`,
    tenantId ? [JSON.stringify([event]), tenantId] : [JSON.stringify([event])]
  );

  for (const webhook of webhooks.rows) {
    if (await isInternalHost(webhook.url)) {
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
          redirect: 'manual',
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
