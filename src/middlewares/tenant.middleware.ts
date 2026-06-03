import { Request, Response, NextFunction } from 'express';
import { extractTenantFromHost, tenantService } from '../shared/multi-tenant.service.js';
import { setTenantContext } from '../shared/db.js';

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

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const host = req.headers.host || '';

  const tenantId = extractTenantFromHost(host);

  if (tenantId && tenantId !== 'default') {
    const tenant = tenantService.getByDomain(tenantId) || tenantService.getById(tenantId);
    if (tenant) {
      req.tenant_id = tenant.id;
      req.locale = tenant.locale;
    } else {
      req.tenant_id = process.env.DEFAULT_TENANT_ID || 'default';
      req.locale = getLocaleFromRequest(req);
    }
  } else {
    req.tenant_id = process.env.DEFAULT_TENANT_ID || 'default';
    req.locale = getLocaleFromRequest(req);
  }

  res.setHeader('X-Tenant-Id', req.tenant_id);
  await setTenantContext(req.tenant_id);
  next();
};
