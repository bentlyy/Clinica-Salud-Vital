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
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createBookingSchema, availableSlotsSchema, bookingIdSchema } from './booking.schema.js';

const router = Router();

router.post('/', authMiddleware, validateZod(createBookingSchema), createBooking);
router.get('/me', authMiddleware, getMyBookings);
router.delete('/:id', authMiddleware, validateZod(bookingIdSchema, 'params'), cancelBooking);
router.get('/available-slots', validateZod(availableSlotsSchema, 'query'), getAvailableSlots);
router.get('/doctor', authMiddleware, authorizeRoles('doctor'), getDoctorBookings);

export default router;

