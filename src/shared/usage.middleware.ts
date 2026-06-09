import { Request, Response, NextFunction } from 'express';
import { recordUsage } from '../modules/saas/saas.service.js';
import { logger } from '../utils/logger.js';

export const usageTracking = (metricKey: string, value: number = 1) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const tenantId = (req as { tenant_id?: string }).tenant_id || process.env.DEFAULT_TENANT_ID || 'default';

    recordUsage(tenantId, metricKey, value).catch((err) => {
      logger.error('[Usage] Failed to record usage:', err);
    });

    next();
  };
};
