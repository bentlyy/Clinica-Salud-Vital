import { Router } from 'express';
import { getSpecialties, createSpecialty } from './specialties.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';
import { validateZod } from '../../middlewares/validate.middleware';
import { createSpecialtySchema } from './specialties.schema';

const router = Router();

router.get('/', getSpecialties);
router.post('/', authMiddleware, authorizeRoles('admin'), validateZod(createSpecialtySchema), createSpecialty);

export default router;
