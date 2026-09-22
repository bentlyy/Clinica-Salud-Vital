import { Request, Response, NextFunction } from 'express';
import { jwtManager } from '../shared/jwt.service.js';
import { UserRole } from '../types/index.js';
import { UnauthorizedError, ForbiddenError, toError } from '../utils/errors.js';
import { readPool } from '../shared/db.js';
import { logger } from '../utils/logger.js';

export interface JwtUser {
  id: number;
  email: string;
  role: UserRole;
  tenant_id: string;
  token_version?: number;
  sid?: number | null;
}

export type AuthRequest = Request & { user?: JwtUser };

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
      tenant_id: string;
      locale: string;
    }
  }
}

const extractAndVerifyUser = (token: string, req: Request): JwtUser | null => {
  const decoded = jwtManager.verify<JwtUser>(token);
  if (!decoded) return null;
  return {
    id: decoded.id,
    email: decoded.email || '',
    role: decoded.role as UserRole,
    tenant_id: decoded.tenant_id ?? process.env.DEFAULT_TENANT_ID ?? 'default',
    token_version: decoded.token_version || 0,
    sid: decoded.sid ?? null,
  };
};

export const setSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
};

const extractToken = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return req.cookies?.access_token;
};

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const tokenStr = extractToken(req);

  if (!tokenStr) {
    next(new UnauthorizedError('Token required'));
    return;
  }

  const user = extractAndVerifyUser(tokenStr, req);
  if (!user) {
    next(new UnauthorizedError('Invalid token'));
    return;
  }

  const reqTenantId = req.tenant_id || process.env.DEFAULT_TENANT_ID || 'default';
  if (reqTenantId && user.tenant_id !== reqTenantId && user.role !== 'superadmin') {
    next(new UnauthorizedError('Tenant mismatch'));
    return;
  }

  try {
    // Enforce session-level state on every protected request: a revoked session
    // (logout, revoke device) or an expired one (absolute cap) rejects the token
    // immediately instead of waiting for the access-token TTL or the refresh flow.
    let query: string;
    const params: unknown[] = [user.id];

    if (user.sid != null) {
      query = `SELECT u.token_version, u.active, s.revoked_at, s.expires_at
               FROM users u
               LEFT JOIN user_sessions s ON s.id = $2 AND s.user_id = u.id
               WHERE u.id = $1`;
      params.push(user.sid);
    } else {
      // Legacy token without a session claim: keep the old behaviour
      // (token_version / active only) so existing sessions survive the rollout.
      query = `SELECT u.token_version, u.active, NULL::timestamptz AS revoked_at, NULL::timestamptz AS expires_at
               FROM users u
               WHERE u.id = $1`;
    }

    if (user.role !== 'superadmin') {
      query += ` AND u.tenant_id = $${params.length + 1}`;
      params.push(user.tenant_id);
    }

    const result = await readPool.query(query, params);
    const rows = result?.rows;
    if (!rows || rows.length === 0) {
      next(new UnauthorizedError('User no longer exists'));
      return;
    }
    if (rows[0].active === false) {
      next(new UnauthorizedError('User is deactivated'));
      return;
    }
    if (rows[0].token_version !== user.token_version) {
      next(new UnauthorizedError('Token version mismatch — session invalidated'));
      return;
    }
    if (rows[0].revoked_at != null) {
      next(new UnauthorizedError('Session revoked'));
      return;
    }
    if (rows[0].expires_at != null && new Date(rows[0].expires_at) <= new Date()) {
      next(new UnauthorizedError('Session expired'));
      return;
    }
  } catch (err) {
    logger.error('Token version verification failed', { error: toError(err).message, userId: user.id });
    next(new UnauthorizedError('Token verification failed'));
    return;
  }

  req.user = user;
  setSecurityHeaders(req, res, next);
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const tokenStr = extractToken(req);

  if (tokenStr) {
    const user = extractAndVerifyUser(tokenStr, req);
    if (user) req.user = user;
  }

  next();
};

export const authMiddlewareNoCache = (req: Request, res: Response, next: NextFunction): void => {
  setSecurityHeaders(req, res, () => {
    authMiddleware(req, res, next);
  });
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Access denied'));
    }

    next();
  };
};
