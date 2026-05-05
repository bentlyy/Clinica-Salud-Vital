import { pool } from '../../shared/db.js';

export const logAction = async ({ user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent }) => {
  await pool.query(`
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    user_id || null,
    action,
    resource_type,
    resource_id || null,
    old_values ? JSON.stringify(old_values) : null,
    new_values ? JSON.stringify(new_values) : null,
    ip_address || null,
    user_agent || null,
  ]);
};

export const getAuditLogs = async ({ user_id, action, resource_type, start_date, end_date, limit = 100, offset = 0 } = {}) => {
  let query = `
    SELECT al.*, u.email AS user_email
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (user_id) {
    query += ` AND al.user_id = $${paramCount++}`;
    params.push(user_id);
  }

  if (action) {
    query += ` AND al.action = $${paramCount++}`;
    params.push(action);
  }

  if (resource_type) {
    query += ` AND al.resource_type = $${paramCount++}`;
    params.push(resource_type);
  }

  if (start_date) {
    query += ` AND al.created_at >= $${paramCount++}`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND al.created_at <= $${paramCount++}`;
    params.push(end_date);
  }

  query += ` ORDER BY al.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
};
