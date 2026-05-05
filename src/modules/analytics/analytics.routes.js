import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import {
  getDashboardStats,
  getBookingsByMonth,
  getTopDoctors,
  getBookingStatusDistribution,
  getMyDoctorStats,
} from './analytics.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/dashboard', authorize('admin'), getDashboardStats);
router.get('/bookings-by-month', authorize('admin', 'doctor'), getBookingsByMonth);
router.get('/top-doctors', authorize('admin'), getTopDoctors);
router.get('/status-distribution', authorize('admin', 'doctor'), getBookingStatusDistribution);
router.get('/my-stats', authorize('doctor'), getMyDoctorStats);

export default router;
