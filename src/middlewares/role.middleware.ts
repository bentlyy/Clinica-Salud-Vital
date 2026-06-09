import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/index.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Unauthorized');
    }

    const userRole = (req.user as { role: UserRole }).role;
    if (!roles.includes(userRole)) {
      throw new ForbiddenError('Forbidden');
    }

    next();
  };
};