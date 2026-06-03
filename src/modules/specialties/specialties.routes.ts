import { Router } from 'express';
import { getSpecialties, createSpecialty } from './specialties.controller.js';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createSpecialtySchema } from './specialties.schema.js';

const router = Router();

router.get('/', getSpecialties);
router.post('/', authMiddleware, authorize('admin'), validateZod(createSpecialtySchema), createSpecialty);

export default router;
