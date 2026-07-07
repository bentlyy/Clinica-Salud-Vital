import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { stripSensitiveFields } from '../shared/sanitize.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const safeBody = req.body ? stripSensitiveFields(req.body as Record<string, unknown>) : undefined;
    const message = `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`;

    if (res.statusCode >= 500) {
      logger.error(message, { body: safeBody });
    } else if (res.statusCode >= 400) {
      logger.warn(message, { body: safeBody });
    } else {
      logger.info(message, { body: safeBody });
    }
  });

  next();
};