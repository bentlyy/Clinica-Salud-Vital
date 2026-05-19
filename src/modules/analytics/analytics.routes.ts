import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import {
  getDashboardStats,
  getBookingsByMonth,
  getTopDoctors,
  getBookingStatusDistribution,
  getMyDoctorStats,
  getNoShows,
  getDiagnosesAnalytics,
  getDemand,
  getSchedules,
  getVitalsAnomalies,
  exportAnalytics,
} from './analytics.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/dashboard', authorize('admin'), getDashboardStats);
router.get('/bookings-by-month', authorize('admin', 'doctor'), getBookingsByMonth);
router.get('/top-doctors', authorize('admin'), getTopDoctors);
router.get('/status-distribution', authorize('admin', 'doctor'), getBookingStatusDistribution);
router.get('/my-stats', authorize('doctor'), getMyDoctorStats);

router.get('/no-shows', authorize('admin'), getNoShows);
router.get('/diagnoses', authorize('admin'), getDiagnosesAnalytics);
router.get('/demand', authorize('admin'), getDemand);
router.get('/schedules', authorize('admin'), getSchedules);
router.get('/vitals', authorize('admin'), getVitalsAnomalies);
router.get('/export-excel', authorize('admin'), exportAnalytics);

export default router;

