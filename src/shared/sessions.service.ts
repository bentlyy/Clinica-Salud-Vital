import { pool } from './db.js';
import crypto from 'crypto';
import { hashToken } from './crypto.service.js';

export interface UserSession {
  id: number;
  user_id: number;
  tenant_id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

const SESSION_COLUMNS = 'id, user_id, tenant_id, ip_address, user_agent, created_at, last_seen_at, expires_at, revoked_at';
const SESSION_TTL_DAYS = 30;

export const createUserSession = async (
  userId: number,
  tenantId: string,
  ip?: string | null,
  userAgent?: string | null,
): Promise<{ sessionId: number; sessionToken: string }> => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  const result = await pool.query(
    `INSERT INTO user_sessions (user_id, tenant_id, session_token, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      userId,
      tenantId,
      hashToken(token),
      ip ? String(ip).slice(0, 45) : null,
      userAgent ? String(userAgent).slice(0, 500) : null,
      expiresAt,
    ]
  );

  return { sessionId: result.rows[0].id as number, sessionToken: token };
};

export const touchUserSession = async (sessionId: number | null): Promise<void> => {
  if (!sessionId) return;
  await pool.query('UPDATE user_sessions SET last_seen_at = NOW() WHERE id = $1', [sessionId]);
};

export const listUserSessions = async (userId: number, tenantId: string): Promise<UserSession[]> => {
  const result = await pool.query(
    `SELECT ${SESSION_COLUMNS}
     FROM user_sessions
     WHERE user_id = $1 AND tenant_id = $2 AND revoked_at IS NULL
     ORDER BY last_seen_at DESC`,
    [userId, tenantId]
  );
  return result.rows as UserSession[];
};

export const revokeUserSession = async (sessionId: number, userId: number, tenantId: string): Promise<boolean> => {
  const result = await pool.query(
    `UPDATE user_sessions SET revoked_at = NOW()
     WHERE id = $1 AND user_id = $2 AND tenant_id = $3 AND revoked_at IS NULL
     RETURNING id`,
    [sessionId, userId, tenantId]
  );
  if (result.rows.length === 0) return false;

  await pool.query(
    'UPDATE refresh_tokens SET revoked = true WHERE session_id = $1 AND revoked = false',
    [sessionId]
  );
  return true;
};

export const revokeAllUserSessions = async (userId: number): Promise<void> => {
  await pool.query(
    'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
};
