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
import { validateZod } from '../../middlewares/validate.middleware';
import { createBookingSchema, availableSlotsSchema, bookingIdSchema } from './booking.schema';

const router = Router();

router.post('/', authMiddleware, validateZod(createBookingSchema), createBooking);
router.get('/me', authMiddleware, getMyBookings);
router.delete('/:id', authMiddleware, validateZod(bookingIdSchema, 'params'), cancelBooking);
router.get('/available-slots', validateZod(availableSlotsSchema, 'query'), getAvailableSlots);
router.get('/doctor', authMiddleware, authorizeRoles('doctor'), getDoctorBookings);

export default router;

