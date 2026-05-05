import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 400;
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

export const notFoundHandler = (req, res, next) => {
  logger.warn('Route not found', { url: req.originalUrl, method: req.method });
  const err = new Error(`Route ${req.method} ${req.originalUrl} not found`);
  err.statusCode = 404;
  next(err);
};
