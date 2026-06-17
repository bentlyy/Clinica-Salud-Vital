import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { getSpecialties, getSpecialtyById, createSpecialty, updateSpecialty, deleteSpecialty } from './specialties.controller.js';

const router = Router();

router.get('/', getSpecialties);
router.get('/:id', getSpecialtyById);
router.post('/', authMiddleware, authorize('admin', 'superadmin'), createSpecialty);
router.put('/:id', authMiddleware, authorize('admin', 'superadmin'), updateSpecialty);
router.delete('/:id', authMiddleware, authorize('admin', 'superadmin'), deleteSpecialty);

export default router;
