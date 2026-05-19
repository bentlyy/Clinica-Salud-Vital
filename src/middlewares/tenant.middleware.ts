import { Request, Response, NextFunction } from 'express';
import { extractTenantFromHost, tenantService } from '../shared/multi-tenant.service.js';

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const host = req.headers.host || '';
  const tenantId = req.headers['x-tenant-id'] as string || extractTenantFromHost(host);

  if (tenantId) {
    const tenant = tenantService.getByDomain(tenantId) || tenantService.getById(tenantId);
    if (tenant) {
      req.tenant_id = tenant.id;
      req.locale = tenant.locale;
    } else {
      req.tenant_id = tenantId;
      req.locale = process.env.APP_LOCALE || 'es';
    }
  } else {
    req.tenant_id = 'default';
    req.locale = process.env.APP_LOCALE || 'es';
  }

  res.setHeader('X-Tenant-Id', req.tenant_id);
  next();
};
