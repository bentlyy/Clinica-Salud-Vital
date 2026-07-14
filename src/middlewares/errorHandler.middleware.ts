import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface AppErrorWithStatus extends Error {
  statusCode?: number;
  code?: string;
}

const isInternalError = (statusCode: number): boolean => statusCode >= 500;

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

  const message = isDev || !isInternalError(statusCode) ? err.message : 'Internal server error';

  const body: Record<string, unknown> = { error: message };
  if (isDev && err.code) body.code = err.code;
  if (isDev && err.stack) body.stack = err.stack;

  res.status(statusCode).json(body);
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  logger.warn('Route not found', { url: req.originalUrl, method: req.method });
  next(new NotFoundError('Route not found'));
};