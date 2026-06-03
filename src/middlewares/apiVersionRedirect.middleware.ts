import type { Request, Response, NextFunction } from 'express';

const EXCLUDED_PREFIXES = ['/api/saas/webhook/stripe'];

export const apiVersionRedirect = (req: Request, _res: Response, next: NextFunction) => {
  const path = req.path;
  if (!path.startsWith('/api/')) return next();
  if (path.startsWith('/api/v1/')) return next();
  if (EXCLUDED_PREFIXES.some(p => path.startsWith(p))) return next();

  req.url = req.url.replace('/api/', '/api/v1/');
  next();
};
