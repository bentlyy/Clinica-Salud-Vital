import * as auditService from './audit.service';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware';

const getQuery = (query: Record<string, unknown>, key: string): string | undefined => {
  const val = query[key];
  return val ? String(val) : undefined;
};

const getQueryInt = (query: Record<string, unknown>, key: string, def: number): number => {
  const val = query[key];
  return val ? parseInt(String(val), 10) : def;
};

export const getAuditLogs = asyncHandler(async (req, res) => {
  const user_id = getQueryInt(req.query, 'user_id', 0);
  const action = getQuery(req.query, 'action');
  const resource_type = getQuery(req.query, 'resource_type');
  const start_date = getQuery(req.query, 'start_date');
  const end_date = getQuery(req.query, 'end_date');
  const limit = getQueryInt(req.query, 'limit', 100);
  const offset = getQueryInt(req.query, 'offset', 0);

  const logs = await auditService.getAuditLogs({
    user_id: user_id || undefined,
    action,
    resource_type,
    start_date,
    end_date,
    limit,
    offset,
  });

  res.json(logs);
});