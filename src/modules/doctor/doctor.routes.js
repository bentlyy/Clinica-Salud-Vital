import { Router } from 'express';
import {
  getDoctors,
  createDoctor,
  getMyDoctorProfile
} from './doctor.controller.js';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';

const router = Router();

// 🔥 admin ve todos
router.get('/', authMiddleware, authorizeRoles('admin'), getDoctors);

// 🔥 solo admin crea doctor
router.post('/', authMiddleware, authorizeRoles('admin'), createDoctor);

// 🔥 doctor ve su perfil
router.get('/me', authMiddleware, authorizeRoles('doctor'), getMyDoctorProfile);

export default router;