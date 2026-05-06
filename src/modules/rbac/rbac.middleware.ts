import { Request, Response, NextFunction } from 'express';
import { hasPermission } from './rbac.service.js';

export const rbac = (requiredPermissions: string[] = []) => {
  return async (req: Request & { user?: { id: number; role: string } }, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id: user_id, role } = req.user;

    for (const permission of requiredPermissions) {
      const hasAccess = await hasPermission(user_id, role, permission);
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied',
          required: permission,
          message: 'You do not have permission to perform this action'
        });
      }
    }

    next();
  };
};

export const canAccessResource = (resource: string, action: string, ownerField = 'user_id') => {
  return async (req: Request & { user?: { id: number; role: string } }, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id: user_id, role } = req.user;
    const permission = `${resource}:${action}`;

    const access = await hasPermission(user_id, role, permission);

    if (!access) {
      return res.status(403).json({
        error: 'Access denied',
        required: permission
      });
    }

    if (permission.includes(':own') && req.params[ownerField]) {
      if (parseInt(String(req.params[ownerField])) !== user_id && role !== 'admin') {
        return res.status(403).json({ error: 'You can only access your own resources' });
      }
    }

    next();
  };
};