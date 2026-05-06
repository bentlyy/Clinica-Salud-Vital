import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { getMyPermissions } from './rbac.controller';

const router = Router();

router.use(authMiddleware);

router.get('/my-permissions', getMyPermissions);

export default router;

