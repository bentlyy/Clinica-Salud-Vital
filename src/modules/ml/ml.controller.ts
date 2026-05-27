import type { Request, Response } from 'express';
import * as mlService from './ml.service.js';
import * as validator from './ml.validator.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { BadRequestError } from '../../utils/errors.js';
import { mlMetricsMiddleware, getMLMetrics } from './ml.middleware.js';
import { mlCache } from './ml.cache.js';
import { logger } from '../../utils/logger.js';

export const trainModels = asyncHandler(async (req: Request, res: Response) => {
  logger.info('[ML Controller] Train models requested');

  const results = await mlService.trainAllModels(req.tenant_id);

  if (results.error) {
    return res.status(207).json({
      message: 'Training completed with errors',
      results
    });
  }

  return res.json({
    message: 'All models trained successfully',
    results
  });
});

export const getModelStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = await mlService.getModelStatus(req.tenant_id);
  const metrics = getMLMetrics();

  res.json({
    models: status,
    metrics,
    cache: status.cacheStats
  });
});

export const resetModels = asyncHandler(async (req: Request, res: Response) => {
  mlService.disposeAllModels(req.tenant_id);
  mlCache.clear();

  res.json({ message: 'Models disposed and cache cleared' });
});

export const getMetrics = asyncHandler(async (req: Request, res: Response) => {
  const metrics = getMLMetrics();
  res.json(metrics);
});

export const clearCache = asyncHandler(async (req: Request, res: Response) => {
  const cleared = mlCache.clear();
  res.json({ message: 'Cache cleared', entriesRemoved: cleared });
});

export const getHealthCheck = asyncHandler(async (req: Request, res: Response) => {
  const status = await mlService.getModelStatus();
  const uptime = process.uptime();

  const allTrained = status.noShowModel === 'trained' &&
                     status.diagnosisModel === 'trained' &&
                     status.demandModel === 'trained' &&
                     status.vitalAnomalyModel === 'trained';

  res.json({
    status: allTrained ? 'healthy' : 'degraded',
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    models: status,
    cache: status.cacheStats,
    timestamp: new Date().toISOString()
  });
});

export const predictNoShow = [
  mlMetricsMiddleware('noShow'),
  asyncHandler(async (req: Request, res: Response) => {
    const validation = validator.validateNoShowPrediction(req.body);
    if (!validation.valid) {
      throw new BadRequestError(validation.errors.join(', '));
    }

    const { doctorId, userId, date, time, bookingId } = req.body;
    const prediction = await mlService.predictNoShow(doctorId, userId, date, time, bookingId, req.tenant_id);

    res.json(prediction);
  })
];

export const classifyDiagnosis = [
  mlMetricsMiddleware('diagnosis'),
  asyncHandler(async (req: Request, res: Response) => {
    const validation = validator.validateDiagnosisClassification(req.body);
    if (!validation.valid) {
      throw new BadRequestError(
        (validation.errors as Array<{ message: string }>).map(e => e.message).join(', ')
      );
    }

    const sanitized = validator.sanitizeMLInput(req.body);
    const result = await mlService.predictDiagnosis(sanitized.chiefComplaint ?? '', req.tenant_id);

    res.json(result);
  })
];

export const getDemandForecast = [
  mlMetricsMiddleware('demand'),
  asyncHandler(async (req: Request, res: Response) => {
    const validation = validator.validateDemandForecast(req.query);
    if (!validation.valid) {
      throw new BadRequestError(validation.errors.join(', '));
    }

    const days = validation.days;
    const forecast = await mlService.forecastDemand(days, req.tenant_id);

    res.json(forecast);
  })
];

export const getOptimalSchedules = asyncHandler(async (req: Request, res: Response) => {
  const schedules = await mlService.analyzeOptimalSchedules(req.tenant_id);
  res.json(schedules);
});

export const analyzeVitals = [
  mlMetricsMiddleware('vitals'),
  asyncHandler(async (req: Request, res: Response) => {
    const validation = validator.validateVitalSignsAnalysis(req.body);
    if (!validation.valid) {
      throw new BadRequestError(validation.errors.join(', '));
    }

    const sanitized = validator.sanitizeMLInput(req.body);
    const result = await mlService.analyzeVitalSigns(sanitized.vitalSigns, req.tenant_id);

    res.json(result);
  })
];

export const getPredictionHistory = asyncHandler(async (req: Request, res: Response) => {
  const modelType = req.query.modelType as string | undefined;
  const limit = parseInt(req.query.limit as string) || 100;
  const history = await mlService.getPredictionHistory(modelType, limit, req.tenant_id);
  res.json({ data: history, count: history.length });
});

export const getModelMetricsHistory = asyncHandler(async (req: Request, res: Response) => {
  const modelType = req.query.modelType as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const metrics = await mlService.getModelMetricsHistory(modelType, limit, req.tenant_id);
  res.json({ data: metrics, count: metrics.length });
});

export const getDemandForecastHistory = asyncHandler(async (req: Request, res: Response) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const limit = parseInt(req.query.limit as string) || 30;
  const forecasts = await mlService.getDemandForecastHistory(startDate, endDate, limit, req.tenant_id);
  return res.json({ data: forecasts, count: forecasts.length });
});

export const exportPredictionData = asyncHandler(async (req: Request, res: Response) => {
  const format = req.query.format as string || 'json';
  const modelType = req.query.modelType as string | undefined;
  const limit = parseInt(req.query.limit as string) || 1000;
  
  const history = await mlService.getPredictionHistory(modelType, limit, req.tenant_id);
  
  if (format === 'csv') {
    if (history.length === 0) {
      return res.status(200).send('No data available');
    }
    
    const headers = ['id', 'model_type', 'prediction_date', 'confidence', 'doctor_id', 'user_id', 'booking_id'];
    const rows = history.map((row: Record<string, unknown>) => [
      row.id,
      row.model_type,
      row.prediction_date,
      row.confidence,
      row.doctor_id,
      row.user_id,
      row.booking_id
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=ml_predictions.csv');
    return res.status(200).send(csv);
  }
  
  return res.json({ data: history, count: history.length });
});

export const exportMetricsData = asyncHandler(async (req: Request, res: Response) => {
  const format = req.query.format as string || 'json';
  const modelType = req.query.modelType as string | undefined;
  const limit = parseInt(req.query.limit as string) || 500;
  
  const metrics = await mlService.getModelMetricsHistory(modelType, limit, req.tenant_id);
  
  if (format === 'csv') {
    if (metrics.length === 0) {
      return res.status(200).send('No data available');
    }
    
    const headers = ['id', 'model_type', 'trained_at', 'duration_ms', 'samples_used', 'accuracy', 'loss_value', 'status'];
    const rows = metrics.map((row: Record<string, unknown>) => [
      row.id,
      row.model_type,
      row.trained_at,
      row.duration_ms,
      row.samples_used,
      row.accuracy,
      row.loss_value,
      row.status
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=ml_metrics.csv');
    return res.status(200).send(csv);
  }
  
  return res.json({ data: metrics, count: metrics.length });
});

export const exportDemandForecastData = asyncHandler(async (req: Request, res: Response) => {
  const format = req.query.format as string || 'json';
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const limit = parseInt(req.query.limit as string) || 100;
  
  const forecasts = await mlService.getDemandForecastHistory(startDate, endDate, limit, req.tenant_id);
  
  if (format === 'csv') {
    if (forecasts.length === 0) {
      return res.status(200).send('No data available');
    }
    
    const headers = ['id', 'forecast_date', 'predicted_demand', 'actual_demand', 'confidence', 'generated_at'];
    const rows = forecasts.map((row: Record<string, unknown>) => [
      row.id,
      row.forecast_date,
      row.predicted_demand,
      row.actual_demand || '',
      row.confidence,
      row.generated_at
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=demand_forecast.csv');
    return res.status(200).send(csv);
  }

  return res.json({ data: forecasts, count: forecasts.length });
});

export const powerBiExport = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenant_id;

  const [predictions, metrics, forecasts, status] = await Promise.all([
    mlService.getPredictionHistory(undefined, 5000, tenantId),
    mlService.getModelMetricsHistory(undefined, 500, tenantId),
    mlService.getDemandForecastHistory(undefined, undefined, 365, tenantId),
    mlService.getModelStatus(tenantId),
  ]);

  const mlMetrics = getMLMetrics();

  res.json({
    predictions,
    model_metrics: metrics,
    demand_forecasts: forecasts,
    model_status: {
      noShowModel: status.noShowModel,
      diagnosisModel: status.diagnosisModel,
      demandModel: status.demandModel,
      vitalAnomalyModel: status.vitalAnomalyModel,
      cache_hits: status.cacheStats?.hits || 0,
      cache_misses: status.cacheStats?.misses || 0,
      cache_hit_rate: status.cacheStats?.hitRate || '0%',
      cache_size: status.cacheStats?.size || 0,
    },
    prediction_metrics: mlMetrics.predictions,
    training_metrics: mlMetrics.training,
    exported_at: new Date().toISOString(),
  });
});
