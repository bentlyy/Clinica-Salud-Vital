import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  cancelBooking,
  getAvailableSlots,
  getDoctorBookings,
} from './booking.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createBookingSchema, availableSlotsSchema, bookingIdSchema } from './booking.schema.js';

const router = Router();

router.post('/', authMiddleware, validate(createBookingSchema), createBooking);
router.get('/me', authMiddleware, getMyBookings);
router.delete('/:id', authMiddleware, validate(bookingIdSchema, 'params'), cancelBooking);
router.get('/available-slots', validate(availableSlotsSchema, 'query'), getAvailableSlots);
router.get('/doctor', authMiddleware, authorizeRoles('doctor'), getDoctorBookings);

export default router;
