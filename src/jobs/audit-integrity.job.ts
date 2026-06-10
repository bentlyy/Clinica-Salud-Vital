import { pool } from '../shared/db.js';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const AUDIT_HMAC_SECRET = (): string => {
  const secret = process.env.AUDIT_HMAC_SECRET;
  if (!secret) throw new Error('AUDIT_HMAC_SECRET environment variable is required');
  return secret;
};

export async function verifyAuditChain(tenantId?: string): Promise<{ valid: boolean; brokenLinks: number; checked: number }> {
  let sql = 'SELECT id, hash, previous_hash, action, tenant_id FROM audit_logs WHERE 1=1';
  const params: unknown[] = [];

  if (tenantId) {
    sql += ' AND tenant_id = $1';
    params.push(tenantId);
  }
  sql += ' ORDER BY created_at ASC, id ASC';

  const { rows } = await pool.query(sql, params);
  let brokenLinks = 0;
  let previousHash: string | null = null;

  for (const row of rows) {
    if (previousHash !== row.previous_hash) {
      brokenLinks++;
      logger.warn(`Audit chain integrity violation at log #${row.id}: expected previous_hash ${previousHash}, got ${row.previous_hash}`);
    }

    const canonical = [
      row.previous_hash || '',
      row.action,
      row.tenant_id || '',
    ].join('|');
    const expectedHash = crypto.createHmac('sha256', AUDIT_HMAC_SECRET()).update(canonical).digest('hex');

    if (expectedHash !== row.hash) {
      brokenLinks++;
      logger.warn(`Audit chain integrity violation at log #${row.id}: hash mismatch`);
    }

    previousHash = row.hash;
  }

  return { valid: brokenLinks === 0, brokenLinks, checked: rows.length };
}
