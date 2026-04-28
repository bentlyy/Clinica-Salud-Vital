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

// 🔥 ver mi disponibilidad (doctor logeado) — debe ir ANTES de /:id
router.get(
  '/me',
  authMiddleware,
  authorizeRoles('doctor'),
  getMyAvailability
);

// 🔥 ver disponibilidad de un doctor (público)
router.get('/:id', getAvailabilityByDoctor);

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