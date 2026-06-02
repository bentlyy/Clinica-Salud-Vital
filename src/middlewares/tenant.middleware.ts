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

const getLocaleFromRequest = (req: Request): string => {
  return (req.headers['accept-language']?.toString().slice(0, 2)) || process.env.APP_LOCALE || 'es';
};

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const host = req.headers.host || '';
  const tenantHeader = req.headers['x-tenant-id'] as string | undefined;

  const tenantId = tenantHeader || extractTenantFromHost(host);

  if (tenantId && tenantId !== 'default') {
    if (tenantHeader) {
      /* X-Tenant-Id header: trust the client */
      const tenant = tenantService.getById(tenantId) || tenantService.getByDomain(tenantId);
      req.tenant_id = tenant ? tenant.id : tenantId;
      req.locale = tenant ? tenant.locale : getLocaleFromRequest(req);
    } else {
      /* Extracted from hostname: only use if tenant exists, otherwise fall back */
      const tenant = tenantService.getByDomain(tenantId) || tenantService.getById(tenantId);
      if (tenant) {
        req.tenant_id = tenant.id;
        req.locale = tenant.locale;
      } else {
        req.tenant_id = process.env.DEFAULT_TENANT_ID || 'default';
        req.locale = getLocaleFromRequest(req);
      }
    }
  } else {
    req.tenant_id = process.env.DEFAULT_TENANT_ID || 'default';
    req.locale = getLocaleFromRequest(req);
  }

  res.setHeader('X-Tenant-Id', req.tenant_id);
  next();
};
