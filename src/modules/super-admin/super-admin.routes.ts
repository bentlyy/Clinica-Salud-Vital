import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import * as superAdminController from './super-admin.controller.js';
import { updateTenantSchema, adminCreateTenantSchema } from './super-admin.schema.js';

const router = Router();

router.use(authMiddleware);

router.get('/stats', authorize('superadmin'), superAdminController.getGlobalStats);

router.get('/analytics/dashboard', authorize('superadmin'), superAdminController.getDashboardData);
router.get('/analytics/top-tenants', authorize('superadmin'), superAdminController.getTopTenantsData);
router.get('/analytics/revenue', authorize('superadmin'), superAdminController.getRevenueData);
router.get('/analytics/growth', authorize('superadmin'), superAdminController.getGrowthData);
router.get('/analytics/tenant-growth/:tenantId', authorize('superadmin'), superAdminController.getTenantGrowthData);

router.get('/tenants', authorize('superadmin'), superAdminController.listTenants);
router.get('/tenants/:id', authorize('superadmin'), superAdminController.getTenantDetail);
router.post('/tenants', authorize('superadmin'), validateZod(adminCreateTenantSchema), superAdminController.adminCreateTenant);
router.patch('/tenants/:id', authorize('superadmin'), validateZod(updateTenantSchema), superAdminController.updateTenant);
router.delete('/tenants/:id', authorize('superadmin'), superAdminController.deleteTenant);

router.get('/users', authorize('superadmin'), superAdminController.listUsers);
router.patch('/users/:userId/active', authorize('superadmin'), superAdminController.toggleUserActive);

router.get('/analytics/health', authorize('superadmin'), superAdminController.getHealthScores);
router.get('/analytics/health/:tenantId', authorize('superadmin'), superAdminController.getHealthScoreDetail);
router.get('/analytics/operations', authorize('superadmin'), superAdminController.getOperations);
router.get('/analytics/churn', authorize('superadmin'), superAdminController.getChurn);
router.get('/analytics/comparison', authorize('superadmin'), superAdminController.getComparison);
router.get('/analytics/occupancy', authorize('superadmin'), superAdminController.getOccupancy);
router.get('/analytics/activity', authorize('superadmin'), superAdminController.getActivity);
router.get('/analytics/alerts', authorize('superadmin'), superAdminController.getAlerts);

export default router;
