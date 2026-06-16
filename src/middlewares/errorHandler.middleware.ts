import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export interface AppErrorWithStatus extends Error {
  statusCode?: number;
  code?: string;
}

const isInternalError = (statusCode: number): boolean => statusCode >= 500;

const sanitizeErrorMessage = (message: string): string => {
  const sqlPatterns = [
    /violates foreign key constraint/gi,
    /violates unique constraint/gi,
    /duplicate key/gi,
    /relation "[^"]+" does not exist/gi,
    /column "[^"]+" does not exist/gi,
    /syntax error at or near/gi,
  ];
  let sanitized = message;
  for (const pattern of sqlPatterns) {
    if (pattern.test(sanitized)) {
      return 'Internal server error';
    }
  }
  return sanitized;
};

export const errorHandler = (
  err: AppErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';

  if (isInternalError(statusCode)) {
    logger.error('Unhandled error', { error: err.message, stack: err.stack, url: req.originalUrl, method: req.method });
  } else {
    logger.warn('Client error', { error: err.message, statusCode, url: req.originalUrl, method: req.method });
  }

  const message = isDev ? err.message : sanitizeErrorMessage(err.message);

  const body: Record<string, unknown> = { error: message };
  if (err.code) body.code = err.code;
  if (isDev && err.stack) body.stack = err.stack;

  res.status(statusCode).json(body);
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  logger.warn('Route not found', { url: req.originalUrl, method: req.method });
  const err = new Error(`Route ${req.method} ${req.originalUrl} not found`) as AppErrorWithStatus;
  err.statusCode = 404;
  next(err);
};