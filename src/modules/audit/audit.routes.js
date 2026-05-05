import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { getAuditLogs } from './audit.controller.js';

const router = Router();

router.use(authMiddleware);
router.use(authorize('admin'));

router.get('/', getAuditLogs);

export default router;
