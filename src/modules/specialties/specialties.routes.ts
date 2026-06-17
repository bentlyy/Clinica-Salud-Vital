import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { getSpecialties, createSpecialty } from './specialties.controller.js';

const router = Router();

router.get('/', getSpecialties);
router.post('/', authMiddleware, authorize('admin', 'superadmin'), createSpecialty);

export default router;
