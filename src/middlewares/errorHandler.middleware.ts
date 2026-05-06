import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export interface AppErrorWithStatus extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (statusCode >= 500) {
    logger.error('Unhandled error', { error: err.message, stack: err.stack, url: req.originalUrl, method: req.method });
  } else {
    logger.warn('Client error', { error: err.message, statusCode, url: req.originalUrl, method: req.method });
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  logger.warn('Route not found', { url: req.originalUrl, method: req.method });
  const err = new Error(`Route ${req.method} ${req.originalUrl} not found`) as AppErrorWithStatus;
  err.statusCode = 404;
  next(err);
};