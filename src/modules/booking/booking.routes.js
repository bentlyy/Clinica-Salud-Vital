// booking.routes.js
import { Router } from 'express';
import { createBooking } from './booking.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { getMyBookings } from './booking.controller.js';
import { cancelBooking } from './booking.controller.js';
import { getAvailableSlots } from './booking.service.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
const router = Router();

router.post('/', authMiddleware, createBooking);
router.get('/me', authMiddleware, getMyBookings);
router.delete('/:id', authMiddleware, cancelBooking)
router.get('/available-slots',authMiddleware, getAvailableSlots);
router.get('/doctor',authMiddleware, roleMiddleware('doctor'), getDoctorBookings);

export default router;