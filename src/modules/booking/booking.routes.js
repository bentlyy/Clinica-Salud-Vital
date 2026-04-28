// booking.routes.js
import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  cancelBooking,
  getAvailableSlots,
  getDoctorBookings
} from './booking.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';

const router = Router();

router.post('/', authMiddleware, createBooking);
router.get('/me', authMiddleware, getMyBookings);
router.delete('/:id', authMiddleware, cancelBooking);
router.get('/available-slots', authMiddleware, getAvailableSlots);
router.get('/doctor', authMiddleware, authorizeRoles('doctor'), getDoctorBookings);

export default router;