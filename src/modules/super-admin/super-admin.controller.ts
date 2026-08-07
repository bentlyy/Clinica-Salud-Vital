import { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import * as superAdminService from './super-admin.service.js';
import { logger } from '../../utils/logger.js';
import { BadRequestError } from '../../utils/errors.js';

export const listTenants = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '20'), 10);
  const active = req.query.active !== undefined ? String(req.query.active) === 'true' : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  const result = await superAdminService.listTenants(page, limit, { active, search });
  res.json(result);
});

export const getTenantDetail = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const result = await superAdminService.getTenantDetail(id);
  res.json(result);
});

export const updateTenant = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const tenant = await superAdminService.updateTenant(id, req.body);
  res.json(tenant);
});

export const deleteTenant = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);

  if (req.body?.confirm !== true) {
    throw new BadRequestError('Must set confirm=true');
  }

  logger.warn('SUPERADMIN DELETE TENANT', { tenantId: id, userId: req.user?.id, ip: req.ip });

  await superAdminService.deleteTenant(id, req.user?.id);
  res.json({ message: 'Tenant soft-deleted. Data retained for compliance.' });
});

export const getGlobalStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await superAdminService.getGlobalStats();
  res.json(stats);
});

export const adminCreateTenant = asyncHandler(async (req: Request, res: Response) => {
  const result = await superAdminService.adminCreateTenant(req.body);

  logger.info('SUPERADMIN CREATE TENANT', { tenantId: result.tenantId, userId: req.user?.id });

  res.status(201).json(result);
});

export const getDashboardData = asyncHandler(async (req: Request, res: Response) => {
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

export const getTenantGrowthData = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = String(req.params.tenantId);
  const months = parseInt(String(req.query.months || '12'), 10);
  const data = await superAdminService.getTenantGrowthMetrics(tenantId, months);
  res.json({ data });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '50'), 10);
  const tenantId = req.query.tenant_id ? String(req.query.tenant_id as string) : undefined;
  const role = req.query.role ? String(req.query.role) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  const result = await superAdminService.listUsers(page, limit, { tenantId, role, search });
  res.json(result);
});

export const toggleUserActive = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(String(req.params.userId), 10);
  const active = req.body.active !== false;

  logger.info('SUPERADMIN TOGGLE USER ACTIVE', { targetUserId: userId, active, adminId: req.user?.id });

  const user = await superAdminService.setUserActive(userId, active, req.tenant_id);
  res.json(user);
});

export const getHealthScores = asyncHandler(async (_req: Request, res: Response) => {
  const data = await superAdminService.getTenantHealthScores();
  res.json({ data });
});

export const getHealthScoreDetail = asyncHandler(async (req: Request, res: Response) => {
  const data = await superAdminService.getTenantHealthDetail(String(req.params.tenantId));
  res.json({ data });
});

export const getOperations = asyncHandler(async (req: Request, res: Response) => {
  const months = parseInt(String(req.query.months || '6'), 10);
  const data = await superAdminService.getOperationMetrics(months);
  res.json({ data });
});

export const getChurn = asyncHandler(async (req: Request, res: Response) => {
  const months = parseInt(String(req.query.months || '12'), 10);
  const data = await superAdminService.getChurnMetrics(months);
  res.json({ data });
});

export const getComparison = asyncHandler(async (_req: Request, res: Response) => {
  const data = await superAdminService.getComparisonTable();
  res.json({ data });
});

export const getOccupancy = asyncHandler(async (_req: Request, res: Response) => {
  const data = await superAdminService.getOccupancyMetrics();
  res.json({ data });
});

export const getActivity = asyncHandler(async (_req: Request, res: Response) => {
  const data = await superAdminService.getActivityMetrics();
  res.json({ data });
});

export const getAlerts = asyncHandler(async (_req: Request, res: Response) => {
  const data = await superAdminService.getAlerts();
  res.json({ data });
});

export const getBillingSummary = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.query.tenant_id ? String(req.query.tenant_id) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  const data = await superAdminService.getBillingSummary({ tenantId, search });
  res.json({ data });
});
