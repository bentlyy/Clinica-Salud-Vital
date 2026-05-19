import { getUserPermissions } from './rbac.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';

export const getMyPermissions = asyncHandler(async (req, res) => {
  const permissions = await getUserPermissions(req.user!.id, req.user!.role);
  res.json({ role: req.user!.role, permissions });
});
