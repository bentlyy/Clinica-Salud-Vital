/**
 * ML/DL Routes
 * Prediction, training and metrics
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware';
import {
  trainModels,
  getModelStatus,
  resetModels,
  getMetrics,
  clearCache,
  getHealthCheck,
  predictNoShow,
  classifyDiagnosis,
  getDemandForecast,
  getOptimalSchedules,
  analyzeVitals,
  getPredictionHistory,
  getModelMetricsHistory,
  getDemandForecastHistory,
  exportPredictionData,
  exportMetricsData,
  exportDemandForecastData
} from './ml.controller';

const router = Router();

router.use(authMiddleware);
router.use(authorize('admin'));

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

router.post('/train', mlTrainLimiter, trainModels);
router.get('/status', getModelStatus);
router.get('/health', getHealthCheck);
router.post('/reset', resetModels);
router.get('/metrics', getMetrics);
router.post('/cache/clear', clearCache);

router.post('/predict-noshow', mlPredictLimiter, predictNoShow);
router.post('/classify-diagnosis', mlPredictLimiter, classifyDiagnosis);
router.get('/demand-forecast', getDemandForecast);
router.get('/optimal-schedules', getOptimalSchedules);
router.post('/analyze-vitals', mlPredictLimiter, analyzeVitals);

router.get('/history/predictions', getPredictionHistory);
router.get('/history/metrics', getModelMetricsHistory);
router.get('/history/forecast', getDemandForecastHistory);

router.get('/export/predictions', exportPredictionData);
router.get('/export/metrics', exportMetricsData);
router.get('/export/forecast', exportDemandForecastData);

export default router;
