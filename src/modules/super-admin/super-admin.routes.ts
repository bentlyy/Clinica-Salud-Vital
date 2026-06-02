import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import * as superAdminController from './super-admin.controller.js';
import { updateTenantSchema, adminCreateTenantSchema } from './super-admin.schema.js';

const router = Router();

router.use(authMiddleware);
router.use(authorize('superadmin'));

router.get('/stats', superAdminController.getGlobalStats);

router.get('/tenants', superAdminController.listTenants);
router.get('/tenants/:id', superAdminController.getTenantDetail);
router.post('/tenants', validateZod(adminCreateTenantSchema), superAdminController.adminCreateTenant);
router.patch('/tenants/:id', validateZod(updateTenantSchema), superAdminController.updateTenant);
router.delete('/tenants/:id', superAdminController.deleteTenant);

router.get('/users', superAdminController.listUsers);
router.patch('/users/:userId/active', superAdminController.toggleUserActive);

export default router;
