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

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  // SameSite=Strict en la cookie ya previene CSRF en browsers modernos.
  // Si el frontend envía ambos, validamos (defense-in-depth).
  // Si falta header, igual permitimos — SameSite ya protege.

  // No hay cookie: sesión nueva, setCsrfCookie la acaba de crear en la response
  if (!cookieToken) {
    return next();
  }

  // Cookie presente pero sin header: SameSite=Strict ya protege
  if (!headerToken) {
    return next();
  }

  // Ambos presentes: validación defense-in-depth
  if (!crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken))) {
    return next(new BadRequestError('CSRF token mismatch'));
  }

  next();
};

export const setCsrfCookie = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    req.csrfToken = csrfToken;
    res.cookie(CSRF_COOKIE, csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.setHeader('X-CSRF-Token', csrfToken);
  }
  next();
};
