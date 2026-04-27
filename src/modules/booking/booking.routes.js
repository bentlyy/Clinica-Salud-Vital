// booking.routes.js
import { Router } from 'express';
import { createBooking } from './booking.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { getMyBookings } from './booking.controller.js';
import { cancelBooking } from './booking.controller.js';
const router = Router();

router.post('/', authMiddleware, createBooking);
router.get('/me', authMiddleware, getMyBookings);
router.delete('/:id', authMiddleware, cancelBooking)

export default router;