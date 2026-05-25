import { Request, Response, NextFunction } from 'express';
import { extractTenantFromHost, tenantService } from '../shared/multi-tenant.service.js';

declare global {
  namespace Express {
    interface Request {
      tenant_id: string;
      locale: string;
    }
  }
}

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const host = req.headers.host || '';
  const tenantHeader = req.headers['x-tenant-id'] as string | undefined;

  const tenantId = tenantHeader || extractTenantFromHost(host);

  if (tenantId && tenantId !== 'default') {
    const tenant = tenantService.getByDomain(tenantId) || tenantService.getById(tenantId);
    if (tenant) {
      req.tenant_id = tenant.id;
      req.locale = tenant.locale;
    } else {
      req.tenant_id = tenantId;
      req.locale = (req.headers['accept-language']?.toString().slice(0, 2) as string) || process.env.APP_LOCALE || 'es';
    }
  } else {
    req.tenant_id = process.env.DEFAULT_TENANT_ID || 'default';
    req.locale = (req.headers['accept-language']?.toString().slice(0, 2) as string) || process.env.APP_LOCALE || 'es';
  }

  res.setHeader('X-Tenant-Id', req.tenant_id);
  next();
};
