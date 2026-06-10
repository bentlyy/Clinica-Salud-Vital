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

router.get('/tenants', authorize('superadmin'), superAdminController.listTenants);
router.get('/tenants/:id', authorize('superadmin'), superAdminController.getTenantDetail);
router.post('/tenants', authorize('superadmin'), validateZod(adminCreateTenantSchema), superAdminController.adminCreateTenant);
router.patch('/tenants/:id', authorize('superadmin'), validateZod(updateTenantSchema), superAdminController.updateTenant);
router.delete('/tenants/:id', authorize('superadmin'), superAdminController.deleteTenant);

router.get('/users', authorize('superadmin'), superAdminController.listUsers);
router.patch('/users/:userId/active', authorize('superadmin'), superAdminController.toggleUserActive);

export default router;
