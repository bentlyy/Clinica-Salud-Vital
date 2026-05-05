import * as auditService from './audit.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { user_id, action, resource_type, start_date, end_date, limit, offset } = req.query;

  const logs = await auditService.getAuditLogs({
    user_id: user_id ? parseInt(user_id) : undefined,
    action,
    resource_type,
    start_date,
    end_date,
    limit: parseInt(limit) || 100,
    offset: parseInt(offset) || 0,
  });

  res.json(logs);
});
