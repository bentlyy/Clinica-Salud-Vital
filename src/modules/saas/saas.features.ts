import type { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { checkFeatureAccess, checkLimits } from './saas.service.js';

export const requireFeature = (featureKey: string) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = (req as { tenant_id?: string }).tenant_id || process.env.DEFAULT_TENANT_ID || 'default';

    const hasAccess = await checkFeatureAccess(tenantId, featureKey);
    if (!hasAccess) {
      res.status(403).json({
        error: 'Feature not available in your current plan',
        feature: featureKey,
        upgrade_url: '/saas/plans',
      });
      return;
    }

    next();
  });
};

export const requireLimit = (resource: 'doctors' | 'patients' | 'storage' | 'ml_predictions' | 'ml_training') => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = (req as { tenant_id?: string }).tenant_id || process.env.DEFAULT_TENANT_ID || 'default';

    const { allowed, current, limit } = await checkLimits(tenantId, resource);
    if (!allowed) {
      res.status(403).json({
        error: `Limit reached for ${resource}`,
        current,
        limit,
        upgrade_url: '/saas/plans',
      });
      return;
    }

    next();
  });
};
