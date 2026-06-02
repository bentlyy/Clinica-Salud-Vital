import { Router } from 'express';
import {
  getDoctors,
  registerDoctor,
  createDoctor,
  invitePerson,
  getMyDoctorProfile,
  listUsers,
  toggleUserActive,
} from './doctor.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { registerDoctorSchema, createDoctorSchema, invitePersonSchema } from './doctor.schema.js';

const router = Router();

router.post('/register', authMiddleware, authorizeRoles('admin'), validateZod(registerDoctorSchema), registerDoctor);

router.post('/invite', authMiddleware, authorizeRoles('admin', 'superadmin'), validateZod(invitePersonSchema), invitePerson);

router.get('/', authMiddleware, authorizeRoles('admin', 'superadmin'), getDoctors);

router.get('/public', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=60');
  next();
}, getDoctors);

router.post('/', authMiddleware, authorizeRoles('admin', 'superadmin'), validateZod(createDoctorSchema), createDoctor);

router.get('/me', authMiddleware, authorizeRoles('doctor'), getMyDoctorProfile);

router.get('/users', authMiddleware, authorizeRoles('admin', 'superadmin'), listUsers);
router.patch('/users/:userId/active', authMiddleware, authorizeRoles('admin', 'superadmin'), toggleUserActive);

export default router;

