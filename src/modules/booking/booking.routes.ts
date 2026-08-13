import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  cancelBooking,
  rescheduleBooking,
  confirmBooking,
  getAvailableSlots,
  getDoctorBookings,
  getDailyDensity,
  getAllBookingsAdmin,
  createBookingSeries,
  getMyBookingSeries,
  cancelBookingSeries,
} from './booking.controller.js';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createBookingSchema, availableSlotsSchema, bookingIdSchema, cancelBookingSchema, rescheduleBookingSchema, createBookingSeriesSchema } from './booking.schema.js';

const router = Router();

router.post('/', authMiddleware, validateZod(createBookingSchema), createBooking);
router.post('/confirm/:token', confirmBooking);
router.get('/me', authMiddleware, getMyBookings);
router.patch('/:id/cancel', authMiddleware, validateZod(bookingIdSchema, 'params'), validateZod(cancelBookingSchema, 'body'), cancelBooking);
router.patch('/:id/reschedule', authMiddleware, validateZod(bookingIdSchema, 'params'), validateZod(rescheduleBookingSchema, 'body'), rescheduleBooking);
router.get('/available-slots', authMiddleware, validateZod(availableSlotsSchema, 'query'), getAvailableSlots);
router.get('/doctor/daily-density', authMiddleware, authorize('doctor'), getDailyDensity);
router.get('/doctor', authMiddleware, authorize('doctor'), getDoctorBookings);
router.get('/all', authMiddleware, authorize('admin', 'superadmin'), getAllBookingsAdmin);
router.post('/series', authMiddleware, authorize('doctor', 'admin', 'superadmin', 'patient', 'user'), validateZod(createBookingSeriesSchema), createBookingSeries);
router.get('/series', authMiddleware, getMyBookingSeries);
router.patch('/series/:id/cancel', authMiddleware, validateZod(bookingIdSchema, 'params'), cancelBookingSeries);

export default router;

