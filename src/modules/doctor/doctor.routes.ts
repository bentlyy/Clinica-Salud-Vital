import { Router } from 'express';
import {
  getDoctors,
  getDoctorsPublic,
  registerDoctor,
  createDoctor,
  invitePerson,
  getMyDoctorProfile,
  listUsers,
  toggleUserActive,
} from './doctor.controller.js';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { registerDoctorSchema, createDoctorSchema, invitePersonSchema } from './doctor.schema.js';

const router = Router();

router.post('/register', authMiddleware, authorize('admin'), validateZod(registerDoctorSchema), registerDoctor);

router.post('/invite', authMiddleware, authorize('admin', 'superadmin'), validateZod(invitePersonSchema), invitePerson);

router.get('/', authMiddleware, authorize('admin', 'superadmin'), getDoctors);

router.get('/public', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=60');
  next();
}, getDoctorsPublic);

router.post('/', authMiddleware, authorize('admin', 'superadmin'), validateZod(createDoctorSchema), createDoctor);

router.get('/me', authMiddleware, authorize('doctor'), getMyDoctorProfile);

router.get('/users', authMiddleware, authorize('admin', 'superadmin'), listUsers);
router.patch('/users/:userId/active', authMiddleware, authorize('admin', 'superadmin'), toggleUserActive);

export default router;

