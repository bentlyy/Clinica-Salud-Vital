import { Router } from 'express';
import { createGuestBooking, getGuestBookingsByRut, cancelGuestBooking } from './guest.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/booking', createGuestBooking);
router.get('/bookings/:rut', getGuestBookingsByRut);
router.delete('/booking/:id', authMiddleware, cancelGuestBooking);

export default router;
