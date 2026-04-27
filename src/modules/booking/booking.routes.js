// booking.routes.js
import { Router } from 'express';
import { createBooking } from './booking.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { getMyBookings } from './booking.controller.js';
import { cancelBooking } from './booking.controller.js';
import { getAvailableSlots } from './booking.service.js';
const router = Router();

router.post('/', authMiddleware, createBooking);
router.get('/me', authMiddleware, getMyBookings);
router.delete('/:id', authMiddleware, cancelBooking)
router.get('/available-slots', getAvailableSlots);

export default router;