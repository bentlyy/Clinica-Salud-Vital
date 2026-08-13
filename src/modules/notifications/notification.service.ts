import { pool } from '../../shared/db.js';
import { NotFoundError } from '../../utils/errors.js';
import { PaginatedResponse } from '../../types/index.js';

export interface CreateNotificationInput {
  tenant_id: string;
  user_id: number;
  type?: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message?: string;
  link?: string;
}

export const createNotification = async (input: CreateNotificationInput): Promise<void> => {
  const type = input.type ?? 'info';
  await pool.query(
    `INSERT INTO notifications (tenant_id, user_id, type, title, message, link)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.tenant_id, input.user_id, type, input.title, input.message ?? null, input.link ?? null]
  );
};

interface ListOpts {
  tenantFilter?: string;
  allUsers?: boolean;
}

export const listNotifications = async (
  tenantId: string,
  userId: number,
  query: { page?: number; limit?: number; is_read?: string } = {},
  opts: ListOpts = {},
): Promise<PaginatedResponse<Record<string, unknown>>> => {
  const safePage = Math.max(1, Number.isInteger(query.page) ? query.page as number : 1);
  const safeLimit = Math.max(1, Math.min(100, Number.isInteger(query.limit) ? query.limit as number : 50));
  const offset = (safePage - 1) * safeLimit;

  const conditions: string[] = [];
  const params: (string | number | boolean)[] = [];

  conditions.push(`tenant_id = $${params.length + 1}`);
  params.push(opts.tenantFilter ?? tenantId);

  if (!opts.allUsers) {
    conditions.push(`user_id = $${params.length + 1}`);
    params.push(userId);
  }

  if (query.is_read !== undefined) {
    conditions.push(`is_read = $${params.length + 1}`);
    params.push(query.is_read === 'true');
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const result = await pool.query(
    `SELECT id, tenant_id, user_id, type, title, message, is_read, link, created_at
     FROM notifications
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, safeLimit, offset]
  );

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM notifications ${whereClause}`,
    params
  );

  const total = countResult.rows[0]?.count ?? 0;

  return {
    data: result.rows,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
};

export const getUnreadCount = async (tenantId: string, userId: number, opts: ListOpts = {}): Promise<number> => {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  conditions.push(`tenant_id = $${params.length + 1}`);
  params.push(opts.tenantFilter ?? tenantId);
  if (!opts.allUsers) {
    conditions.push(`user_id = $${params.length + 1}`);
    params.push(userId);
  }
  conditions.push(`is_read = false`);
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE ${conditions.join(' AND ')}`,
    params
  );
  return result.rows[0]?.count ?? 0;
};

export const markAsRead = async (id: number, userId: number, tenantId: string): Promise<Record<string, unknown>> => {
  const result = await pool.query(
    `UPDATE notifications SET is_read = true
     WHERE id = $1 AND user_id = $2 AND tenant_id = $3
     RETURNING id, tenant_id, user_id, type, title, message, is_read, link, created_at`,
    [id, userId, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Notification not found');
  return result.rows[0];
};

export const markAllAsRead = async (userId: number, tenantId: string, opts: ListOpts = {}): Promise<number> => {
  const result = await pool.query(
    `UPDATE notifications SET is_read = true
     WHERE user_id = $1 AND tenant_id = $2 AND is_read = false`,
    [userId, opts.tenantFilter ?? tenantId]
  );
  return result.rowCount ?? 0;
};
