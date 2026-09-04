import type { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDurationSeconds, normalizePath } from '../shared/metrics.service.js';

const SKIP_PATHS = new Set([
  '/metrics',
  '/api/metrics',
  '/health',
  '/api/health',
  '/health/live',
  '/api/health/live',
]);

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (SKIP_PATHS.has(req.path)) {
    next();
    return;
  }

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const status = String(res.statusCode);
    const path = normalizePath(req.path);
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;

    httpRequestsTotal.inc({ method: req.method, path, status });
    httpRequestDurationSeconds.observe({ method: req.method, path, status }, durationSeconds);
  });

  next();
};