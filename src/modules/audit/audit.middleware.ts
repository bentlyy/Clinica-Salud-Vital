import { Request, Response, NextFunction } from 'express';
import { logAction } from './audit.service.js';
import { logger } from '../../utils/logger.js';
import { stripSensitiveFields } from '../../shared/sanitize.js';

const SENSITIVE_AUDIT_FIELDS = ['password', 'current_password', 'new_password', 'totp_secret', 'totp_token', 'token', 'access_token', 'refresh_token', 'secret'];

export const auditMiddleware = (
  action: string,
  resource_type: string,
  getIdFromResponse: ((body: Record<string, unknown>) => string | undefined) | null = null,
  getOldValues?: (req: Request) => Promise<Record<string, unknown> | null>,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let oldValues: Record<string, unknown> | undefined;

    if (['PUT', 'PATCH', 'DELETE'].includes(req.method) && getOldValues && req.params.id) {
      try {
        oldValues = await getOldValues(req) ?? undefined;
      } catch (err) {
        logger.error('Audit old_values fetch error:', err);
      }
    }

    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      const resourceId: number | undefined = getIdFromResponse ? Number(getIdFromResponse(body as Record<string, unknown>)) : (req.params.id ? Number(req.params.id) : undefined);

      const auditBody = ['POST', 'PUT', 'PATCH'].includes(req.method) && req.body
        ? stripSensitiveFields(req.body as Record<string, unknown>)
        : null;

      logAction({
        user_id: req.user?.id,
        action,
        resource_type,
        resource_id: resourceId,
        old_values: oldValues,
        new_values: auditBody ?? undefined,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        tenant_id: req.tenant_id,
      }).catch((err: Error) => logger.error('Audit log error:', err));

      return originalJson(body);
    };

    next();
  };
};
