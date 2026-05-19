import { Request, Response, NextFunction } from 'express';
import { logAction } from './audit.service.js';
import { logger } from '../../utils/logger.js';

export const auditMiddleware = (action: string, resource_type: string, getIdFromResponse: ((body: Record<string, unknown>) => string | undefined) | null = null) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      const resourceId: number | undefined = getIdFromResponse ? Number(getIdFromResponse(body as Record<string, unknown>)) : (req.params.id ? Number(req.params.id) : undefined);

      logAction({
        user_id: req.user?.id,
        action,
        resource_type,
        resource_id: resourceId,
        new_values: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : null,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
      }).catch((err: Error) => logger.error('Audit log error:', err));

      return originalJson(body);
    };

    next();
  };
};
