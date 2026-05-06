import { Router } from 'express';
import { createGuestBooking, getGuestBookingsByRut, cancelGuestBooking } from './guest.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { guestBookingSchema, guestRutSchema, guestBookingIdSchema } from './guest.schema.js';

const router = Router();

router.post('/booking', validate(guestBookingSchema), createGuestBooking);
router.get('/bookings/:rut', validate(guestRutSchema, 'params'), getGuestBookingsByRut);
router.delete('/booking/:id', authMiddleware, validate(guestBookingIdSchema, 'params'), cancelGuestBooking);

export default router;