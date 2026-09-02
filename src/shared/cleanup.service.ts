import { pool } from './db.js';
import { logger } from '../utils/logger.js';

const CLEANUP_BATCH_SIZE = 500;

export const cleanupExpiredRefreshTokens = async (): Promise<number> => {
  const result = await pool.query(
    `DELETE FROM refresh_tokens
     WHERE id IN (
       SELECT id FROM refresh_tokens
       WHERE expires_at < NOW() OR revoked = true
       LIMIT $1
     )`,
    [CLEANUP_BATCH_SIZE]
  );
  return result.rowCount ?? 0;
};

export const cleanupExpiredSessions = async (): Promise<number> => {
  const result = await pool.query(
    `DELETE FROM user_sessions
     WHERE id IN (
       SELECT id FROM user_sessions
       WHERE expires_at < NOW() OR revoked_at IS NOT NULL
       LIMIT $1
     )`,
    [CLEANUP_BATCH_SIZE]
  );
  return result.rowCount ?? 0;
};

export const cleanupOrphanedSessions = async (): Promise<number> => {
  const result = await pool.query(
    `DELETE FROM user_sessions
     WHERE id IN (
       SELECT us.id FROM user_sessions us
       LEFT JOIN refresh_tokens rt ON rt.session_id = us.id AND rt.revoked = false
       WHERE rt.id IS NULL AND us.revoked_at IS NULL
       LIMIT $1
     )`,
    [CLEANUP_BATCH_SIZE]
  );
  return result.rowCount ?? 0;
};

export const cleanupExpiredPasswordResetTokens = async (): Promise<number> => {
  const result = await pool.query(
    `DELETE FROM password_reset_tokens
     WHERE expires_at < NOW() OR used = true`,
  );
  return result.rowCount ?? 0;
};

export const runFullCleanup = async (): Promise<{
  refreshTokens: number;
  sessions: number;
  orphanedSessions: number;
  passwordResets: number;
}> => {
  const start = Date.now();

  const [refreshTokens, sessions, orphanedSessions, passwordResets] = await Promise.all([
    cleanupExpiredRefreshTokens(),
    cleanupExpiredSessions(),
    cleanupOrphanedSessions(),
    cleanupExpiredPasswordResetTokens(),
  ]);

  const elapsed = Date.now() - start;
  const total = refreshTokens + sessions + orphanedSessions + passwordResets;

  if (total > 0) {
    logger.info('[CLEANUP] Expired data purged', {
      refreshTokens,
      sessions,
      orphanedSessions,
      passwordResets,
      elapsedMs: elapsed,
    });
  }

  return { refreshTokens, sessions, orphanedSessions, passwordResets };
};
