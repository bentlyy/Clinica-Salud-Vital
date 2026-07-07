import { pool } from '../shared/db.js';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

const lastActivityMap = new Map<number, number>();

export const trackActivity = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.user) {
    const now = Date.now();
    const userId = req.user.id;
    const last = lastActivityMap.get(userId);
    if (!last || now - last > 5 * 60 * 1000) {
      lastActivityMap.set(userId, now);
      setImmediate(() => {
        pool.query('UPDATE users SET last_activity_at = NOW() WHERE id = $1', [userId])
          .catch((err: Error) => logger.warn('[Session] Failed updating activity:', err.message));
      });
    }
  }
  next();
};
