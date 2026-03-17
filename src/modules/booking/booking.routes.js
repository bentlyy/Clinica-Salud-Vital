// modules/booking/booking.routes.js
import { Router } from 'express';
import { createBooking, getBookings } from './booking.controller.js';

const router = Router();

router.get('/', getBookings);   // 👈 NUEVO
router.post('/', createBooking);

export default router;