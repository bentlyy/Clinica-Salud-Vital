import * as auditService from './audit.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { getQuery, getQueryInt } from '../../shared/query.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const user_id = getQueryInt(req.query, 'user_id', 0);
  const action = getQuery(req.query, 'action');
  const resource_type = getQuery(req.query, 'resource_type');
  const start_date = getQuery(req.query, 'start_date');
  const end_date = getQuery(req.query, 'end_date');
  const limit = getQueryInt(req.query, 'limit', 20);
  const page = getQueryInt(req.query, 'page', 1);

  const isSuperAdmin = req.user?.role === 'superadmin';
  const tenant_id = isSuperAdmin && req.query.tenant_id
    ? String(req.query.tenant_id)
    : req.tenant_id;

  const logs = await auditService.getAuditLogs({
    tenant_id,
    user_id: user_id || undefined,
    action,
    resource_type,
    start_date,
    end_date,
    limit,
    page,
  });

  res.json(logs);
});