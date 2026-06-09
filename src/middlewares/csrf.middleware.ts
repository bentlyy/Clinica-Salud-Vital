import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { BadRequestError } from '../utils/errors.js';

declare global {
  namespace Express {
    interface Request {
      csrfToken?: string;
    }
  }
}

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_SESSION_COOKIE = 'csrf-session';

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const sessionToken = req.cookies?.[CSRF_SESSION_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (!cookieToken && !sessionToken) {
    return next();
  }

  if (!headerToken) {
    return next(new BadRequestError(`Missing ${CSRF_HEADER} header`));
  }

  if (sessionToken) {
    const combined = crypto.createHmac('sha256', sessionToken).update(cookieToken || '').digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(combined))) {
      return next(new BadRequestError('CSRF token mismatch'));
    }
  } else {
    if (!cookieToken) {
      return next(new BadRequestError('CSRF token missing'));
    }
    if (!crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken))) {
      return next(new BadRequestError('CSRF token mismatch'));
    }
  }

  next();
};

export const setCsrfCookie = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const sessionToken = crypto.randomBytes(32).toString('hex');
    req.csrfToken = csrfToken;
    res.cookie(CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.cookie('csrf-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
  next();
};
