import { Request, Response, NextFunction } from 'express';
import { AppError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const isInternalError = (statusCode: number): boolean => statusCode >= 500;

export const errorHandler = (
  err: AppError & { stack?: string },
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const statusCode = err.statusCode || 500;

  if (isInternalError(statusCode)) {
    logger.error('Unhandled error', { error: err.message, stack: err.stack, url: req.originalUrl, method: req.method });
  } else {
    logger.warn('Client error', { error: err.message, statusCode, url: req.originalUrl, method: req.method });
  }

  const message = !isInternalError(statusCode) ? err.message : 'Internal server error';

  const body: Record<string, unknown> = { error: message };
  if (err.code) body.code = err.code;

  res.status(statusCode).json(body);
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  logger.warn('Route not found', { url: req.originalUrl, method: req.method });
  next(new NotFoundError('Route not found'));
};
