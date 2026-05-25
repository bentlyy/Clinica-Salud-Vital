import { Request, Response, NextFunction } from 'express';
import { recordUsage } from '../modules/saas/saas.service.js';

export const usageTracking = (metricKey: string, value: number = 1) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const tenantId = (req as { tenant_id?: string }).tenant_id || process.env.DEFAULT_TENANT_ID || 'default';

    recordUsage(tenantId, metricKey, value).catch(() => {
      // non-critical, don't block the request
    });

    next();
  };
};
