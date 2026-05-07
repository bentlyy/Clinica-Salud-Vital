import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createGuestBooking, getGuestBookingsByRut, cancelGuestBooking } from './guest.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { guestBookingSchema, guestRutSchema, guestBookingIdSchema } from './guest.schema.js';

const router = Router();

const rutLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many RUT lookups, try again later' },
});

router.post('/booking', validateZod(guestBookingSchema), createGuestBooking);
router.get('/bookings/:rut', rutLookupLimiter, validateZod(guestRutSchema, 'params'), getGuestBookingsByRut);
router.delete('/booking/:id', authMiddleware, validateZod(guestBookingIdSchema, 'params'), cancelGuestBooking);

export default router;