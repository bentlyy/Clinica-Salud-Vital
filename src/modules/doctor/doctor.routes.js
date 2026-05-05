import { Router } from 'express';
import {
  getDoctors,
  registerDoctor,
  createDoctor,
  getMyDoctorProfile
} from './doctor.controller.js';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { registerDoctorSchema, createDoctorSchema } from './doctor.schema.js';

const router = Router();

router.post('/register', authMiddleware, authorizeRoles('admin'), validate(registerDoctorSchema), registerDoctor);

router.get('/', authMiddleware, authorizeRoles('admin'), getDoctors);

router.get('/public', getDoctors);

router.post('/', authMiddleware, authorizeRoles('admin'), validate(createDoctorSchema), createDoctor);

router.get('/me', authMiddleware, authorizeRoles('doctor'), getMyDoctorProfile);

export default router;