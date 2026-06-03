import { Router } from 'express';
import {
  createAvailability,
  getAvailabilityByDoctor,
  getMyAvailability,
  deleteAvailability
} from './availability.controller.js';

import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

// debe ir ANTES de /:id
router.get(
  '/me',
  authMiddleware,
  authorize('doctor'),
  getMyAvailability
);

router.get('/:id', getAvailabilityByDoctor);

router.post(
  '/',
  authMiddleware,
  authorize('doctor'),
  createAvailability
);

router.delete(
  '/:id',
  authMiddleware,
  authorize('doctor'),
  deleteAvailability
);

export default router;

