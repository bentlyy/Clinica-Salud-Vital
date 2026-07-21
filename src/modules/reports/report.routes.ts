import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { getAvailable, generate, getById } from './report.controller.js';

const router = Router();

router.use(authMiddleware);
router.use(authorize('admin', 'superadmin'));

router.get('/available', getAvailable);
router.post('/generate', generate);
router.get('/:id', getById);

export default router;
