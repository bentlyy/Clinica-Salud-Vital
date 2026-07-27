import { pool } from '../shared/db.js';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

const THROTTLE_MS = 5 * 60 * 1000;
const EVICT_AGE_MS = 15 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

const lastActivityMap = new Map<number, number>();

const evictStale = (): void => {
  if (lastActivityMap.size === 0) return;
  const cutoff = Date.now() - EVICT_AGE_MS;
  for (const [userId, ts] of lastActivityMap) {
    if (ts < cutoff) lastActivityMap.delete(userId);
  }
};

const cleanupTimer = setInterval(evictStale, CLEANUP_INTERVAL_MS);
if (cleanupTimer.unref) cleanupTimer.unref();

export const trackActivity = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.user) {
    const now = Date.now();
    const userId = req.user.id;
    const last = lastActivityMap.get(userId);
    if (!last || now - last > THROTTLE_MS) {
      lastActivityMap.set(userId, now);
      setImmediate(() => {
        pool.query('UPDATE users SET last_activity_at = NOW() WHERE id = $1', [userId])
          .catch((err: Error) => logger.warn('[Session] Failed updating activity:', err.message));
      });
    }
  }
  next();
};

export function stopSessionCleanup(): void {
  clearInterval(cleanupTimer);
}
