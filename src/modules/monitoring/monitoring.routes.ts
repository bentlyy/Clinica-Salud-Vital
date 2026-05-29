import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import {
  getSystemHealth,
  getMemoryReport,
  getDbReport,
  getDbSlowQueries,
  getDbTableSizes,
  getMlReport,
  getLogs,
  exportDbSizes,
  resetMetrics,
  triggerGc,
  getDashboardData,
} from './monitoring.controller.js';

const router = Router();

const adminOnly = [authMiddleware, authorizeRoles('superadmin', 'admin')];

router.get('/health', asyncHandler(getSystemHealth));
router.get('/memory', ...adminOnly, asyncHandler(getMemoryReport));
router.get('/database', ...adminOnly, asyncHandler(getDbReport));
router.get('/database/slow-queries', ...adminOnly, asyncHandler(getDbSlowQueries));
router.get('/database/table-sizes', ...adminOnly, asyncHandler(getDbTableSizes));
router.get('/ml', ...adminOnly, asyncHandler(getMlReport));
router.get('/logs', ...adminOnly, asyncHandler(getLogs));
router.post('/database/export-sizes', ...adminOnly, asyncHandler(exportDbSizes));
router.post('/ml/reset', ...adminOnly, asyncHandler(resetMetrics));
router.post('/gc', ...adminOnly, asyncHandler(triggerGc));
router.get('/dashboard', ...adminOnly, asyncHandler(getDashboardData));

export default router;
