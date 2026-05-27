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

// debe ir ANTES de /:id
router.get(
  '/me',
  authMiddleware,
  authorizeRoles('doctor'),
  getMyAvailability
);

router.get('/:id', getAvailabilityByDoctor);

router.post(
  '/',
  authMiddleware,
  authorizeRoles('doctor'),
  createAvailability
);

router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('doctor'),
  deleteAvailability
);

export default router;

