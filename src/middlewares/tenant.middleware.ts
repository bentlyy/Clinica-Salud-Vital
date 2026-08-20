import { Request, Response, NextFunction } from 'express';
import { tenantService, loadTenantsFromDB } from '../shared/multi-tenant.service.js';
import { pool } from '../shared/db.js';
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
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh',
  '/api/bookings/available-slots',
  '/api/guest/booking',
  '/api/doctors/public',
  '/api/specialties',
  '/api/saas/plans',
  '/api/auth/.well-known/jwks.json',
]);

const PUBLIC_PATH_PREFIXES = ['/api/guest/bookings/', '/api/bookings/confirm/'];

const getLocaleFromRequest = (req: Request): string => {
  return req.headers['accept-language']?.toString().slice(0, 2) || process.env.APP_LOCALE || 'es';
};

const setDbTenantContext = async (tenantId: string): Promise<void> => {
  try {
    await pool.query('SELECT set_tenant_id($1)', [tenantId]);
  } catch {
    // Managed PostgreSQL (Render/PgBouncer) may not support custom GUCs.
    // RLS policies use COALESCE(current_setting(...), 'default') as fallback.
  }
};

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
  const userTenantId = req.user?.tenant_id;
  const isPublicPath = PUBLIC_PATHS.has(req.path) || PUBLIC_PATH_PREFIXES.some(p => req.path.startsWith(p));

  const rawTenantId = userTenantId || headerTenantId;

  if (!rawTenantId) {
    if (process.env.NODE_ENV === 'production' && !isPublicPath) {
      logger.warn('Request rejected: missing tenant_id', { path: req.path, method: req.method });
      next(new BadRequestError('X-Tenant-Id header is required'));
      return;
    }
    req.tenant_id = process.env.DEFAULT_TENANT_ID || 'default';
    req.locale = getLocaleFromRequest(req);
    await setDbTenantContext(req.tenant_id);
    next();
    return;
  }

  let tenant = tenantService.getById(rawTenantId);

  if (!tenant) {
    try {
      await loadTenantsFromDB();
      tenant = tenantService.getById(rawTenantId);
    } catch (err) {
      logger.error('Failed to reload tenants from DB', err);
    }

    if (!tenant) {
      logger.warn('Tenant not found', { tenantId: rawTenantId });
      if (!isPublicPath) {
        next(new NotFoundError('Tenant not found or inactive'));
        return;
      }
      req.tenant_id = rawTenantId;
      req.locale = getLocaleFromRequest(req);
      await setDbTenantContext(req.tenant_id);
      next();
      return;
    }
  }

  req.tenant_id = tenant.id;
  req.locale = tenant.locale;
  res.setHeader('X-Tenant-Id', req.tenant_id);
  await setDbTenantContext(req.tenant_id);
  next();
};
