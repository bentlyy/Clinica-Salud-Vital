import { Router } from 'express';
import {
  createAvailability,
  getAvailabilityByDoctor,
  getMyAvailability,
  deleteAvailability,
  bulkCreateAvailability,
  getMyExceptions,
  createException,
  deleteException
} from './availability.controller.js';

import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createAvailabilitySchema, availabilityIdSchema, createExceptionSchema, exceptionIdSchema, bulkAvailabilitySchema } from './availability.schema.js';

const availabilityRouter = Router();

availabilityRouter.get(
  '/me',
  authMiddleware,
  authorize('doctor'),
  getMyAvailability
);

availabilityRouter.get('/:id', getAvailabilityByDoctor);

availabilityRouter.post(
  '/',
  authMiddleware,
  authorize('doctor'),
  validateZod(createAvailabilitySchema),
  createAvailability
);

availabilityRouter.post(
  '/bulk',
  authMiddleware,
  authorize('doctor', 'admin', 'superadmin'),
  validateZod(bulkAvailabilitySchema),
  bulkCreateAvailability
);

availabilityRouter.delete(
  '/:id',
  authMiddleware,
  authorize('doctor'),
  validateZod(availabilityIdSchema, 'params'),
  deleteAvailability
);

const exceptionRouter = Router();

exceptionRouter.get(
  '/me',
  authMiddleware,
  authorize('doctor'),
  getMyExceptions
);

exceptionRouter.post(
  '/',
  authMiddleware,
  authorize('doctor'),
  validateZod(createExceptionSchema),
  createException
);

exceptionRouter.delete(
  '/:id',
  authMiddleware,
  authorize('doctor'),
  validateZod(exceptionIdSchema, 'params'),
  deleteException
);

export { availabilityRouter, exceptionRouter };
