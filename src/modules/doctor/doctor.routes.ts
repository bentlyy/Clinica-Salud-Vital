import { Router } from 'express';
import {
  getDoctors,
  registerDoctor,
  createDoctor,
  getMyDoctorProfile
} from './doctor.controller';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { registerDoctorSchema, createDoctorSchema } from './doctor.schema';

const router = Router();

router.post('/register', authMiddleware, authorizeRoles('admin'), validate(registerDoctorSchema), registerDoctor);

router.get('/', authMiddleware, authorizeRoles('admin'), getDoctors);

router.get('/public', getDoctors);

router.post('/', authMiddleware, authorizeRoles('admin'), validate(createDoctorSchema), createDoctor);

router.get('/me', authMiddleware, authorizeRoles('doctor'), getMyDoctorProfile);

export default router;

