import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { requireFeature } from '../saas/saas.features.js';
import {
  trainModels,
  getModelStatus,
  resetModels,
  getMetrics,
  clearCache,
  getHealthCheck,
  predictNoShow,
  getDemandForecast,
  getOptimalSchedules,
  analyzeVitals,
  getPredictionHistory,
  getModelMetricsHistory,
  getDemandForecastHistory,
  exportPredictionData,
  exportMetricsData,
  exportDemandForecastData,
  powerBiExport
} from './ml.controller.js';

const router = Router();

router.use(authMiddleware);
router.use(authorize('admin', 'superadmin'));

const mlTrainLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many training requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const mlPredictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many prediction requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/train', mlTrainLimiter, requireFeature('ml-training'), trainModels);
router.get('/status', getModelStatus);
router.get('/health', getHealthCheck);
router.post('/reset', resetModels);
router.get('/metrics', getMetrics);
router.post('/cache/clear', clearCache);

router.post('/predict-noshow', mlPredictLimiter, requireFeature('ml'), predictNoShow);
router.get('/demand-forecast', requireFeature('ml'), getDemandForecast);
router.get('/optimal-schedules', requireFeature('ml'), getOptimalSchedules);
router.post('/analyze-vitals', mlPredictLimiter, requireFeature('ml'), analyzeVitals);

router.get('/history/predictions', requireFeature('ml'), getPredictionHistory);
router.get('/history/metrics', requireFeature('ml'), getModelMetricsHistory);
router.get('/history/forecast', requireFeature('ml'), getDemandForecastHistory);

router.get('/export/predictions', requireFeature('ml'), requireFeature('ml-export'), exportPredictionData);
router.get('/export/metrics', requireFeature('ml'), requireFeature('ml-export'), exportMetricsData);
router.get('/export/forecast', requireFeature('ml'), requireFeature('ml-export'), exportDemandForecastData);
router.get('/powerbi-export', requireFeature('ml'), powerBiExport);

export default router;
