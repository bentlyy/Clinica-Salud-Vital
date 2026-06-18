import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  cancelBooking,
  getAvailableSlots,
  getDoctorBookings,
  getDailyDensity,
  getAllBookingsAdmin,
} from './booking.controller.js';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createBookingSchema, availableSlotsSchema, bookingIdSchema } from './booking.schema.js';

const router = Router();

router.post('/', authMiddleware, validateZod(createBookingSchema), createBooking);
router.get('/me', authMiddleware, getMyBookings);
router.delete('/:id', authMiddleware, validateZod(bookingIdSchema, 'params'), cancelBooking);
router.get('/available-slots', validateZod(availableSlotsSchema, 'query'), getAvailableSlots);
router.get('/doctor/daily-density', authMiddleware, authorize('doctor'), getDailyDensity);
router.get('/doctor', authMiddleware, authorize('doctor'), getDoctorBookings);
router.get('/all', authMiddleware, authorize('admin', 'superadmin'), getAllBookingsAdmin);

export default router;

