import { pool } from '../../shared/db.js';

export interface AuditLogInput {
  user_id?: number;
  action: string;
  resource_type: string;
  resource_id?: number;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
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
}

export const logAction = async (input: AuditLogInput): Promise<void> => {
  await pool.query(
    'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [
      input.user_id || null,
      input.action,
      input.resource_type,
      input.resource_id || null,
      input.old_values ? JSON.stringify(input.old_values) : null,
      input.new_values ? JSON.stringify(input.new_values) : null,
      input.ip_address || null,
      input.user_agent || null
    ]
  );
};

export const getAuditLogs = async (query: AuditLogQuery = {}): Promise<unknown[]> => {
  let sql = 'SELECT al.*, u.email AS user_email FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1';
  const params: unknown[] = [];
  let paramCount = 1;

  if (query.user_id) {
    sql += ` AND al.user_id = $${paramCount++}`;
    params.push(query.user_id);
  }
  if (query.action) {
    sql += ` AND al.action = $${paramCount++}`;
    params.push(query.action);
  }
  if (query.resource_type) {
    sql += ` AND al.resource_type = $${paramCount++}`;
    params.push(query.resource_type);
  }
  if (query.start_date) {
    sql += ` AND al.created_at >= $${paramCount++}`;
    params.push(query.start_date);
  }
  if (query.end_date) {
    sql += ` AND al.created_at <= $${paramCount++}`;
    params.push(query.end_date);
  }

  sql += ` ORDER BY al.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
  params.push(query.limit || 100, query.offset || 0);

  const result = await pool.query(sql, params);
  return result.rows;
};