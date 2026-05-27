import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { getJWTSecret } from '../shared/jwt.js';
import { UserRole } from '../types/index.js';

export interface JwtUser {
  id: number;
  email: string;
  role: UserRole;
  tenant_id: string;
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
  try {
    const decoded = jwt.verify(token, getJWTSecret()) as JwtPayload & JwtUser;
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role as UserRole,
      tenant_id: decoded.tenant_id || req.tenant_id || process.env.DEFAULT_TENANT_ID || 'default',
    };
  } catch {
    return null;
  }
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const accessToken = req.headers['x-access-token'] as string | undefined;

  const tokenStr = authHeader?.split(' ')[1] || accessToken;

  if (!tokenStr) {
    res.status(401).json({ error: 'Token required' });
    return;
  }

  const user = extractAndVerifyUser(tokenStr, req);
  if (!user) {
    try {
      jwt.verify(tokenStr, getJWTSecret());
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        return;
      }
    }
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  req.user = user;
  next();
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (token) {
    const user = extractAndVerifyUser(token, req);
    if (user) req.user = user;
  }

  next();
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    next();
  };
};
