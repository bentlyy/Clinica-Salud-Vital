import type { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utils/errors.js';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const csrfProtection = (req: Request, _res: Response, next: NextFunction) => {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (!origin && !referer) {
    if (process.env.NODE_ENV === 'production') {
      return next(new BadRequestError('Missing Origin or Referer header'));
    }
    return next();
  }

  const allowedHosts = [
    ...(process.env.FRONTEND_URL ? [new URL(process.env.FRONTEND_URL).hostname] : []),
    process.env.RENDER_EXTERNAL_URL ? new URL(process.env.RENDER_EXTERNAL_URL).hostname : null,
  ].filter(Boolean) as string[];

  const extractHost = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  };

  const originHost = origin ? extractHost(origin) : null;
  const refererHost = referer ? extractHost(referer) : null;

  if (originHost && !allowedHosts.includes(originHost) && !originHost.endsWith('.localhost')) {
    return next(new BadRequestError('Cross-origin request rejected'));
  }

  if (refererHost && !allowedHosts.includes(refererHost) && !refererHost.endsWith('.localhost')) {
    return next(new BadRequestError('Cross-origin request rejected'));
  }

  next();
};
