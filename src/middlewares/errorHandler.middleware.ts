import { Request, Response, NextFunction } from 'express';
import { AppError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { notifyCritical } from '../shared/alerts.service.js';

const isInternalError = (statusCode: number): boolean => statusCode >= 500;

export const errorHandler = (
  err: AppError & { stack?: string },
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const statusCode = err.statusCode || 500;
  const requestId = (req.headers?.['x-request-id'] as string | undefined) ?? undefined;

  if (isInternalError(statusCode)) {
    logger.error('Unhandled error', { error: err.message, stack: err.stack, url: req.originalUrl, method: req.method, requestId });
    notifyCritical({
      title: `HTTP ${statusCode} ${req.method} ${req.originalUrl}`,
      message: err.message,
      meta: { stack: err.stack, url: req.originalUrl, method: req.method, requestId, code: err.code },
    });
  } else {
    logger.warn('Client error', { error: err.message, statusCode, url: req.originalUrl, method: req.method, requestId });
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
