import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { getMyPermissions } from './rbac.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/my-permissions', getMyPermissions);

export default router;