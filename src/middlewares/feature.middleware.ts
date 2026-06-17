import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors.js';
import { checkFeatureAccess } from '../modules/saas/saas.service.js';

export const requireFeature = (featureKey: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const hasAccess = await checkFeatureAccess(featureKey, req.tenant_id);
    if (!hasAccess) {
      throw new ForbiddenError(`Esta función requiere un plan superior. Por favor, actualiza tu plan para acceder a "${featureKey}".`);
    }
    next();
  };
};
