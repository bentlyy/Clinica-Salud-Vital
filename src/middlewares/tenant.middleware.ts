import { Request, Response, NextFunction } from 'express';
import { extractTenantFromHost, tenantService, loadTenantsFromDB } from '../shared/multi-tenant.service.js';
import { setTenantContext, verifyTenantContext, tenantAls } from '../shared/db.js';
import { logger } from '../utils/logger.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

declare global {
  namespace Express {
    interface Request {
      tenant_id: string;
      locale: string;
    }
  }
}

const PUBLIC_PATHS = new Set([
  '/',
  '/health',
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/i18n/translations',
  '/api/v1/booking/slots',
  '/api/v1/specialties',
  '/api/v1/saas/plans',
  '/api/v1/saas/checkout',
  '/api/v1/stripe/webhook',
  '/api/v1/auth/.well-known/jwks.json',
]);

const PUBLIC_WITH_TENANT = new Set([
  '/api/v1/booking/slots',
  '/api/v1/specialties',
]);

const getLocaleFromRequest = (req: Request): string => {
  return req.headers['accept-language']?.toString().slice(0, 2) || process.env.APP_LOCALE || 'es';
};

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const host = req.headers.host || '';
  const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
  const userTenantId = (req as any).user?.tenant_id;
  const isPublicPath = PUBLIC_PATHS.has(req.path);

  // Priority: JWT user tenant > X-Tenant-Id header > subdomain
  // On public paths, validate X-Tenant-Id against known tenants to prevent spoofing
  let rawTenantId: string | null;
  if (isPublicPath && headerTenantId && !userTenantId) {
    if (PUBLIC_WITH_TENANT.has(req.path)) {
      const knownTenant = tenantService.getById(headerTenantId) || tenantService.getByDomain(headerTenantId);
      if (!knownTenant) {
        logger.warn('X-Tenant-Id spoofing attempt on public path', { headerTenantId, path: req.path });
        next(new BadRequestError('Invalid tenant'));
        return;
      }
      rawTenantId = knownTenant.id;
    } else {
      rawTenantId = extractTenantFromHost(host) || process.env.DEFAULT_TENANT_ID || 'default';
    }
  } else {
    rawTenantId = userTenantId || headerTenantId || extractTenantFromHost(host);
  }

  if (!rawTenantId) {
    if (process.env.NODE_ENV === 'production' && !isPublicPath) {
      logger.warn('Request rejected: missing tenant_id', {
        path: req.path,
        host,
        method: req.method,
      });
      next(new BadRequestError('X-Tenant-Id header is required'));
      return;
    }
    req.tenant_id = process.env.DEFAULT_TENANT_ID || 'default';
    req.locale = getLocaleFromRequest(req);
    await setTenantContext(req.tenant_id);
    tenantAls.run({ tenantId: req.tenant_id }, () => { next(); });
    return;
  }

  let tenant = tenantService.getByDomain(rawTenantId) || tenantService.getById(rawTenantId);

  if (!tenant) {
    // Attempt to reload tenants from DB
    try {
      await loadTenantsFromDB();
      tenant = tenantService.getByDomain(rawTenantId) || tenantService.getById(rawTenantId);
    } catch (err) {
      logger.error('Failed to reload tenants from DB', err);
    }

    if (!tenant) {
      logger.warn('Tenant not found', { tenantId: rawTenantId, host });
      if (!isPublicPath) {
        next(new NotFoundError('Tenant not found or inactive'));
        return;
      }
      req.tenant_id = rawTenantId;
      req.locale = getLocaleFromRequest(req);
      await setTenantContext(req.tenant_id);
      tenantAls.run({ tenantId: req.tenant_id }, () => { next(); });
      return;
    }
  }

  req.tenant_id = tenant.id;
  req.locale = tenant.locale;
  res.setHeader('X-Tenant-Id', req.tenant_id);

  await setTenantContext(req.tenant_id);

  // Verify RLS context was set correctly (blocking, returns 500 on failure)
  if (process.env.NODE_ENV === 'production') {
    const isContextValid = await verifyTenantContext(req.tenant_id);
    if (!isContextValid) {
      next(new Error('RLS context verification failed — aborting request'));
      return;
    }
  }

  tenantAls.run({ tenantId: req.tenant_id }, () => { next(); });
};
