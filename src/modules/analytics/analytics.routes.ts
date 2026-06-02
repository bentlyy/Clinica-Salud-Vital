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

router.get('/dashboard', authorize('admin', 'superadmin'), getDashboardStats);
router.get('/bookings-by-month', authorize('admin', 'doctor', 'superadmin'), getBookingsByMonth);
router.get('/top-doctors', authorize('admin', 'superadmin'), getTopDoctors);
router.get('/status-distribution', authorize('admin', 'doctor', 'superadmin'), getBookingStatusDistribution);
router.get('/my-stats', authorize('doctor'), getMyDoctorStats);

router.get('/no-shows', authorize('admin', 'superadmin'), getNoShows);
router.get('/diagnoses', authorize('admin', 'superadmin'), getDiagnosesAnalytics);
router.get('/demand', authorize('admin', 'superadmin'), getDemand);
router.get('/schedules', authorize('admin', 'superadmin'), getSchedules);
router.get('/vitals', authorize('admin', 'superadmin'), getVitalsAnomalies);
router.get('/export-excel', authorize('admin', 'superadmin'), exportAnalytics);

export default router;

