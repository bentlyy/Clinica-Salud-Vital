import { Router } from 'express';
import {
  getDoctors,
  registerDoctor,
  createDoctor,
  getMyDoctorProfile
} from './doctor.controller.js';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';

const router = Router();

// 🔥 admin registra nuevo doctor (crea user + perfil en una transacción)
router.post('/register', authMiddleware, authorizeRoles('admin'), registerDoctor);

// 🔥 admin ve todos los doctores
router.get('/', authMiddleware, authorizeRoles('admin'), getDoctors);

// 🔥 público (pacientes ven doctores)
router.get('/public', getDoctors);

// 🔥 admin crea doctor (vincula a un usuario existente con rol doctor)
router.post('/', authMiddleware, authorizeRoles('admin'), createDoctor);

// 🔥 doctor ve su perfil
router.get('/me', authMiddleware, authorizeRoles('doctor'), getMyDoctorProfile);

export default router;