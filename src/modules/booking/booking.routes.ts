import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  cancelBooking,
  getAvailableSlots,
  getDoctorBookings,
} from './booking.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createBookingSchema, availableSlotsSchema, bookingIdSchema } from './booking.schema';

const router = Router();

router.post('/', authMiddleware, validate(createBookingSchema), createBooking);
router.get('/me', authMiddleware, getMyBookings);
router.delete('/:id', authMiddleware, validate(bookingIdSchema, 'params'), cancelBooking);
router.get('/available-slots', validate(availableSlotsSchema, 'query'), getAvailableSlots);
router.get('/doctor', authMiddleware, authorizeRoles('doctor'), getDoctorBookings);

export default router;

