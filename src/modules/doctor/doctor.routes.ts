import { Router } from 'express';
import {
  getDoctors,
  registerDoctor,
  createDoctor,
  getMyDoctorProfile
} from './doctor.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';
import { validateZod } from '../../middlewares/validate.middleware';
import { registerDoctorSchema, createDoctorSchema } from './doctor.schema';

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

