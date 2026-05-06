import { Router } from 'express';
import { createGuestBooking, getGuestBookingsByRut, cancelGuestBooking } from './guest.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { guestBookingSchema, guestRutSchema, guestBookingIdSchema } from './guest.schema.js';

const router = Router();

router.post('/booking', validateZod(guestBookingSchema), createGuestBooking);
router.get('/bookings/:rut', validateZod(guestRutSchema, 'params'), getGuestBookingsByRut);
router.delete('/booking/:id', authMiddleware, validateZod(guestBookingIdSchema, 'params'), cancelGuestBooking);

export default router;