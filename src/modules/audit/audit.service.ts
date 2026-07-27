import { pool } from '../../shared/db.js';
import { computeHmac } from '../../shared/crypto.service.js';

const computeAuditHash = (previousHash: string | null, input: AuditLogInput): string => {
  const canonical = [
    previousHash || '',
    input.action,
    input.resource_type,
    String(input.resource_id ?? ''),
    input.old_values ? JSON.stringify(input.old_values, Object.keys(input.old_values).sort()) : '',
    input.new_values ? JSON.stringify(input.new_values, Object.keys(input.new_values).sort()) : '',
    input.ip_address || '',
    input.tenant_id || '',
    Date.now().toString(),
  ].join('|');
  return computeHmac(canonical);
};

export interface AuditLogInput {
  user_id?: number;
  action: string;
  resource_type: string;
  resource_id?: number;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  tenant_id?: string;
}

export interface AuditLogQuery {
  user_id?: number;
  action?: string;
  resource_type?: string;
  resource_id?: number;
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
  tenant_id?: string;
}

export const logAction = async (input: AuditLogInput): Promise<void> => {
  const hasTenant = !!input.tenant_id;

  // Get previous hash for chain
  const prevResult = await pool.query(
    'SELECT hash FROM audit_logs ORDER BY created_at DESC LIMIT 1'
  );
  const previousHash: string | null = prevResult.rows[0]?.hash || null;
  const hash = computeAuditHash(previousHash, input);

  await pool.query(
    `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent, hash, previous_hash${hasTenant ? ', tenant_id' : ''}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10${hasTenant ? ', $11' : ''})`,
    hasTenant
      ? [input.user_id || null, input.action, input.resource_type, input.resource_id || null,
         input.old_values ? JSON.stringify(input.old_values) : null,
         input.new_values ? JSON.stringify(input.new_values) : null,
         input.ip_address || null, input.user_agent || null,
         hash, previousHash, input.tenant_id]
      : [input.user_id || null, input.action, input.resource_type, input.resource_id || null,
         input.old_values ? JSON.stringify(input.old_values) : null,
         input.new_values ? JSON.stringify(input.new_values) : null,
         input.ip_address || null, input.user_agent || null,
         hash, previousHash]
  );
};

export const getAuditLogs = async (query: AuditLogQuery = {}): Promise<unknown[]> => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramCount = 1;

  if (query.tenant_id) { conditions.push(`al.tenant_id = $${paramCount++}`); params.push(query.tenant_id); }
  if (query.user_id) { conditions.push(`al.user_id = $${paramCount++}`); params.push(query.user_id); }
  if (query.action) { conditions.push(`al.action = $${paramCount++}`); params.push(query.action); }
  if (query.resource_type) { conditions.push(`al.resource_type = $${paramCount++}`); params.push(query.resource_type); }
  if (query.start_date) { conditions.push(`al.created_at >= $${paramCount++}`); params.push(query.start_date); }
  if (query.end_date) { conditions.push(`al.created_at <= $${paramCount++}`); params.push(query.end_date); }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const sql = `SELECT al.*, u.email AS user_email FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ${whereClause} ORDER BY al.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
  params.push(query.limit || 100, query.offset || 0);

  const result = await pool.query(sql, params);
  return result.rows;
};