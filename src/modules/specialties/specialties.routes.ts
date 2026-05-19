import { Router } from 'express';
import { getSpecialties, createSpecialty } from './specialties.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createSpecialtySchema } from './specialties.schema.js';

const router = Router();

router.get('/', getSpecialties);
router.post('/', authMiddleware, authorizeRoles('admin'), validateZod(createSpecialtySchema), createSpecialty);

export default router;
