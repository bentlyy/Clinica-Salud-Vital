import { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import * as superAdminService from './super-admin.service.js';

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
  if (req.body.confirm !== true) {
    res.status(400).json({ error: 'Must set confirm=true to delete a tenant' });
    return;
  }
  await superAdminService.deleteTenant(id);
  res.json({ message: 'Tenant deleted' });
});

export const getGlobalStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await superAdminService.getGlobalStats();
  res.json(stats);
});

export const adminCreateTenant = asyncHandler(async (req: Request, res: Response) => {
  const result = await superAdminService.adminCreateTenant(req.body);
  res.status(201).json(result);
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '50'), 10);
  const tenantId = req.query.tenant_id ? String(req.query.tenant_id) : undefined;
  const role = req.query.role ? String(req.query.role) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  const result = await superAdminService.listUsers(page, limit, { tenantId, role, search });
  res.json(result);
});

export const toggleUserActive = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  const active = req.body.active !== false;
  const user = await superAdminService.setUserActive(userId, active);
  res.json(user);
});
