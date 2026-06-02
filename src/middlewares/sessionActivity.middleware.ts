import { pool } from '../shared/db.js';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export const trackActivity = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.user) {
    pool.query('UPDATE users SET last_activity_at = NOW() WHERE id = $1', [req.user.id])
      .catch((err: Error) => logger.warn('[Session] Failed updating activity:', err.message));
  }
  next();
};
