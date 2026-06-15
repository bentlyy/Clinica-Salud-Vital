import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import {
  getSystemHealth,
  getMemoryReport,
  getDbReport,
  getDbSlowQueries,
  getDbTableSizes,
  getLogs,
  exportDbSizes,
  triggerGc,
  getDashboardData,
} from './monitoring.controller.js';

const router = Router();

const adminOnly = [authMiddleware, authorize('superadmin', 'admin')];

router.get('/health', getSystemHealth);
router.get('/memory', ...adminOnly, getMemoryReport);
router.get('/database', ...adminOnly, getDbReport);
router.get('/database/slow-queries', ...adminOnly, getDbSlowQueries);
router.get('/database/table-sizes', ...adminOnly, getDbTableSizes);
router.get('/logs', ...adminOnly, getLogs);
router.post('/database/export-sizes', ...adminOnly, exportDbSizes);
router.post('/gc', ...adminOnly, triggerGc);
router.get('/dashboard', ...adminOnly, getDashboardData);

export default router;
