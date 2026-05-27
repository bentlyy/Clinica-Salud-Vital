import { Request, Response } from 'express';
import { getUserPermissions } from './rbac.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';

export const getMyPermissions = asyncHandler(async (req: Request, res: Response) => {
  const permissions = await getUserPermissions(req.user!.id, req.user!.role, req.tenant_id);
  res.json({ role: req.user!.role, permissions });
});
