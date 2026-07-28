import { Request, Response, NextFunction } from 'express';
import { jwtManager } from '../shared/jwt.service.js';
import { UserRole } from '../types/index.js';
import { UnauthorizedError, ForbiddenError, toError } from '../utils/errors.js';
import { pool } from '../shared/db.js';
import { logger } from '../utils/logger.js';

export interface JwtUser {
  id: number;
  email: string;
  role: UserRole;
  tenant_id: string;
  token_version?: number;
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
    const result = await pool.query(
      'SELECT token_version FROM users WHERE id = $1 AND tenant_id = $2',
      [user.id, user.tenant_id]
    );
    const rows = result?.rows;
    if (rows && rows.length > 0) {
      if (user.token_version !== 0 && rows[0].token_version !== user.token_version) {
        next(new UnauthorizedError('Token version mismatch — session invalidated'));
        return;
      }
    }
  } catch (err) {
    logger.warn('Token version verification failed (non-critical)', { error: toError(err).message });
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
