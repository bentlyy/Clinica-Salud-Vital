import { Router } from 'express';
import {
  getDoctors,
  registerDoctor,
  createDoctor,
  getMyDoctorProfile
} from './doctor.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { registerDoctorSchema, createDoctorSchema } from './doctor.schema.js';

const router = Router();

router.post('/register', authMiddleware, authorizeRoles('admin'), validateZod(registerDoctorSchema), registerDoctor);

router.get('/', authMiddleware, authorizeRoles('admin'), getDoctors);

router.get('/public', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=60');
  next();
}, getDoctors);

router.post('/', authMiddleware, authorizeRoles('admin'), validateZod(createDoctorSchema), createDoctor);

router.get('/me', authMiddleware, authorizeRoles('doctor'), getMyDoctorProfile);

export default router;

