import { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { logPhiAccess } from '../../shared/db.js';
import * as superAdminService from './super-admin.service.js';
import { logger } from '../../utils/logger.js';
import { BadRequestError } from '../../utils/errors.js';

export const listTenants = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '20'), 10);
  const active = req.query.active !== undefined ? String(req.query.active) === 'true' : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  logPhiAccess({
    userId: req.user?.id,
    tenantId: req.tenant_id,
    action: 'superadmin.list_tenants',
    entityType: 'tenant',
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent'],
  }).catch(err => logger.error('[SuperAdmin] PHI access log error:', err));

  const result = await superAdminService.listTenants(page, limit, { active, search });
  res.json(result);
});

export const getTenantDetail = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);

  logPhiAccess({
    userId: req.user?.id,
    tenantId: req.tenant_id,
    action: 'superadmin.view_tenant_detail',
    entityType: 'tenant',
    entityId: undefined,
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent'],
  }).catch(err => logger.error('[SuperAdmin] PHI access log error:', err));

  const result = await superAdminService.getTenantDetail(id);
  res.json(result);
});

export const updateTenant = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);

  logPhiAccess({
    userId: req.user?.id,
    tenantId: req.tenant_id,
    action: 'superadmin.update_tenant',
    entityType: 'tenant',
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent'],
  }).catch(err => logger.error('[SuperAdmin] PHI access log error:', err));

  const tenant = await superAdminService.updateTenant(id, req.body);
  res.json(tenant);
});

export const deleteTenant = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (req.body.confirm !== true) {
    throw new BadRequestError('Must set confirm=true to delete a tenant');
  }

  logger.warn('SUPERADMIN DELETE TENANT', { tenantId: id, userId: req.user?.id, ip: req.ip });

  logPhiAccess({
    userId: req.user?.id,
    tenantId: req.tenant_id,
    action: 'superadmin.delete_tenant',
    entityType: 'tenant',
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent'],
  }).catch(err => logger.error('[SuperAdmin] PHI access log error:', err));

  await superAdminService.deleteTenant(id, req.user?.id);
  res.json({ message: 'Tenant soft-deleted. Data retained for compliance.' });
});

export const getGlobalStats = asyncHandler(async (req: Request, res: Response) => {
  logPhiAccess({
    userId: req.user?.id,
    tenantId: req.tenant_id,
    action: 'superadmin.view_global_stats',
    entityType: 'system',
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent'],
  }).catch(err => logger.error('[SuperAdmin] PHI access log error:', err));

  const stats = await superAdminService.getGlobalStats();
  res.json(stats);
});

export const adminCreateTenant = asyncHandler(async (req: Request, res: Response) => {
  const result = await superAdminService.adminCreateTenant(req.body);

  logger.info('SUPERADMIN CREATE TENANT', { tenantId: result.tenantId, userId: req.user?.id });

  res.status(201).json(result);
});

export const getDashboardData = asyncHandler(async (req: Request, res: Response) => {
  logPhiAccess({
    userId: req.user?.id,
    tenantId: req.tenant_id,
    action: 'superadmin.view_dashboard',
    entityType: 'system',
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent'],
  }).catch(err => logger.error('[SuperAdmin] PHI access log error:', err));

  const [dashboard, planDistribution] = await Promise.all([
    superAdminService.getGlobalDashboard(),
    superAdminService.getPlanDistribution(),
  ]);
  res.json({ data: { ...dashboard, planDistribution } });
});

export const getTopTenantsData = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || '10'), 10);
  const metric = (String(req.query.metric || 'bookings')) as 'bookings' | 'users' | 'doctors' | 'revenue';
  const validMetrics = ['bookings', 'users', 'doctors', 'revenue'];
  const data = await superAdminService.getTopTenants(limit, validMetrics.includes(metric) ? metric : 'bookings');
  res.json({ data });
});

export const getRevenueData = asyncHandler(async (req: Request, res: Response) => {
  const months = parseInt(String(req.query.months || '12'), 10);
  const data = await superAdminService.getRevenueAnalytics(months);
  res.json({ data });
});

export const getGrowthData = asyncHandler(async (req: Request, res: Response) => {
  const months = parseInt(String(req.query.months || '12'), 10);
  const data = await superAdminService.getGrowthMetrics(months);
  res.json({ data });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '50'), 10);
  const tenantId = req.query.tenant_id ? String(req.query.tenant_id as string) : undefined;
  const role = req.query.role ? String(req.query.role) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  logPhiAccess({
    userId: req.user?.id,
    tenantId: req.tenant_id,
    action: 'superadmin.list_users',
    entityType: 'user',
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent'],
  }).catch(err => logger.error('[SuperAdmin] PHI access log error:', err));

  const result = await superAdminService.listUsers(page, limit, { tenantId, role, search });
  res.json(result);
});

export const toggleUserActive = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(String(req.params.userId), 10);
  const active = req.body.active !== false;

  logger.info('SUPERADMIN TOGGLE USER ACTIVE', { targetUserId: userId, active, adminId: req.user?.id });

  const user = await superAdminService.setUserActive(userId, active);
  res.json(user);
});
