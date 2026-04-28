import { Router } from 'express';
import {
  createAvailability,
  getAvailabilityByDoctor,
  getMyAvailability,
  deleteAvailability
} from './availability.controller.js';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';

const router = Router();

// 🔥 ver disponibilidad de un doctor (público)
router.get('/:id', getAvailabilityByDoctor);

// 🔥 ver mi disponibilidad (doctor logeado)
router.get(
  '/me',
  authMiddleware,
  authorizeRoles('doctor'),
  getMyAvailability
);

// 🔥 crear disponibilidad (solo doctor)
router.post(
  '/',
  authMiddleware,
  authorizeRoles('doctor'),
  createAvailability
);

// 🔥 eliminar bloque
router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('doctor'),
  deleteAvailability
);

export default router;