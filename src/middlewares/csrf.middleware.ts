import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ForbiddenError } from '../utils/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_COOKIE = 'csrf_token';

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  const existing = (req.cookies as Record<string, string> | undefined)?.[CSRF_COOKIE];

  if (!existing) {
    const token = crypto.randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
    next();
    return;
  }

  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const headerToken = req.headers['x-csrf-token'];
  if (typeof headerToken !== 'string' || headerToken.length === 0 || headerToken !== existing) {
    next(new ForbiddenError('CSRF token mismatch'));
    return;
  }

  next();
};
