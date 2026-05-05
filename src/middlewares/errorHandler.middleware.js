export const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 400;
  const message = err.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error('[UNHANDLED ERROR]', err);
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFoundHandler = (req, res, next) => {
  const err = new Error(`Route ${req.method} ${req.originalUrl} not found`);
  err.statusCode = 404;
  next(err);
};
