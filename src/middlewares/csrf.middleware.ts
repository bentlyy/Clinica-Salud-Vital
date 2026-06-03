import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { BadRequestError } from '../utils/errors.js';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (!cookieToken) {
    return next();
  }

  if (!headerToken) {
    return next(new BadRequestError(`Missing ${CSRF_HEADER} header`));
  }

  if (!crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken))) {
    return next(new BadRequestError('CSRF token mismatch'));
  }

  next();
};

export const setCsrfCookie = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
  next();
};
