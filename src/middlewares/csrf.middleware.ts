import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ForbiddenError } from '../utils/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_COOKIE = 'csrf_token';

const timingSafeEqualString = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const issueCookie = (res: Response, token: string): void => {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  });
};

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  const existing = (req.cookies as Record<string, string> | undefined)?.[CSRF_COOKIE];

  // Los métodos seguros solo siembran el token; nunca se permite una petición
  // mutante sin cookie previa (FND-F2: antes se generaba y se dejaba pasar).
  if (SAFE_METHODS.has(req.method)) {
    if (!existing) issueCookie(res, crypto.randomBytes(24).toString('hex'));
    next();
    return;
  }

  if (!existing) {
    next(new ForbiddenError('CSRF token missing'));
    return;
  }

  const headerToken = req.headers['x-csrf-token'];
  if (typeof headerToken !== 'string' || headerToken.length === 0 || !timingSafeEqualString(headerToken, existing)) {
    next(new ForbiddenError('CSRF token mismatch'));
    return;
  }

  next();
};
