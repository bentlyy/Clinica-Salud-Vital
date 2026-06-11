import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/ml/ml.service.js', () => ({
  trainAllModels: vi.fn(),
  getModelStatus: vi.fn(),
  disposeAllModels: vi.fn(),
  predictNoShow: vi.fn(),
  forecastDemand: vi.fn(),
  analyzeOptimalSchedules: vi.fn(),
  analyzeVitalSigns: vi.fn(),
  getPredictionHistory: vi.fn(),
  getModelMetricsHistory: vi.fn(),
  getDemandForecastHistory: vi.fn(),
}));

vi.mock('../../src/modules/ml/ml.validator.js', () => ({
  validateNoShowPrediction: vi.fn(),
  validateDemandForecast: vi.fn(),
  validateVitalSignsAnalysis: vi.fn(),
  sanitizeMLInput: vi.fn(),
}));

vi.mock('../../src/modules/ml/ml.middleware.js', () => ({
  mlMetricsMiddleware: vi.fn(() => (req, res, next) => next()),
  getMLMetrics: vi.fn(() => ({
    predictions: { noShow: { total: 0, success: 0, error: 0, avgTime: 0 } },
    training: { totalRuns: 0, success: 0, error: 0, totalDuration: 0 },
    errors: [],
  })),
  resetMLMetrics: vi.fn(),
  trackTrainingMetric: vi.fn(),
  errorLoggingMiddleware: vi.fn((err, req, res, next) => next(err)),
}));

vi.mock('../../src/modules/ml/ml.cache.js', () => ({
  mlCache: {
    clear: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
    getStats: vi.fn(() => ({ hits: 0, misses: 0, hitRate: '0%', size: 0 })),
    generateKey: vi.fn(),
  },
  cacheMiddleware: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../../src/shared/queue.service.js', () => ({
  enqueueJob: vi.fn(),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import * as mlService from '../../src/modules/ml/ml.service.js';
import * as validator from '../../src/modules/ml/ml.validator.js';
import * as mlController from '../../src/modules/ml/ml.controller.js';
import { mlCache } from '../../src/modules/ml/ml.cache.js';
import { enqueueJob } from '../../src/shared/queue.service.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('trainModels', () => {
  it('queues training job and returns confirmation', async () => {
    vi.mocked(enqueueJob).mockResolvedValue(undefined);
    const req = { tenant_id: 'test-tenant' };
    const res = { json: vi.fn() };
    const next = vi.fn();
    mlController.trainModels(req, res, next);
    await flush();
    expect(enqueueJob).toHaveBeenCalledWith('ml:train', { tenantId: 'test-tenant' });
    expect(res.json).toHaveBeenCalledWith({
      message: 'Training queued. Check /api/v1/ml/status for progress.',
      tenantId: 'test-tenant'
    });
  });
});

describe('getModelStatus', () => {
  it('returns model status and metrics', async () => {
    vi.mocked(mlService.getModelStatus).mockResolvedValue({ noShowModel: 'trained', cacheStats: { hits: 1 } });
    const req = { tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();
    mlController.getModelStatus(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({
      models: { noShowModel: 'trained', cacheStats: { hits: 1 } },
      metrics: expect.any(Object),
      cache: { hits: 1 },
    });
  });
});

describe('resetModels', () => {
  it('disposes models and clears cache', async () => {
    const req = { tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();
    mlController.resetModels(req, res, next);
    await flush();
    expect(mlService.disposeAllModels).toHaveBeenCalledWith('test');
    expect(mlCache.clear).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Models disposed and cache cleared' });
  });
});

describe('getMetrics', () => {
  it('returns metrics', async () => {
    const req = {};
    const res = { json: vi.fn() };
    const next = vi.fn();
    mlController.getMetrics(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalled();
  });
});

describe('clearCache', () => {
  it('clears cache', async () => {
    vi.mocked(mlCache.clear).mockReturnValue(5);
    const req = {};
    const res = { json: vi.fn() };
    const next = vi.fn();
    mlController.clearCache(req, res, next);
    await flush();
    expect(mlCache.clear).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Cache cleared', entriesRemoved: 5 });
  });
});

describe('getHealthCheck', () => {
  it('returns healthy when all models trained', async () => {
    vi.mocked(mlService.getModelStatus).mockResolvedValue({
      noShowModel: 'trained', demandModel: 'trained', vitalAnomalyModel: 'trained',
      cacheStats: { hits: 1 },
    });
    const req = {};
    const res = { json: vi.fn() };
    const next = vi.fn();
    mlController.getHealthCheck(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'healthy' }));
  });

  it('returns degraded when some models not trained', async () => {
    vi.mocked(mlService.getModelStatus).mockResolvedValue({
      noShowModel: 'untrained', demandModel: 'trained', vitalAnomalyModel: 'trained',
      cacheStats: {},
    });
    const req = {};
    const res = { json: vi.fn() };
    const next = vi.fn();
    mlController.getHealthCheck(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'degraded' }));
  });
});

describe('predictNoShow', () => {
  it('returns prediction', async () => {
    vi.mocked(validator.validateNoShowPrediction).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(mlService.predictNoShow).mockResolvedValue({ probability: 0.3 });
    const req = { tenant_id: 'test', body: { doctorId: 1, userId: 2, date: '2026-01-20', time: '10:00', bookingId: 5 } };
    const res = { json: vi.fn() };
    const next = vi.fn();
    const handlers = mlController.predictNoShow;
    handlers[1](req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ probability: 0.3 });
  });

  it('calls next with validation error', async () => {
    vi.mocked(validator.validateNoShowPrediction).mockReturnValue({ valid: false, errors: ['Invalid input'] });
    const req = { body: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();
    const handlers = mlController.predictNoShow;
    handlers[1](req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('getDemandForecast', () => {
  it('returns forecast', async () => {
    vi.mocked(validator.validateDemandForecast).mockReturnValue({ valid: true, errors: [], days: 7 });
    vi.mocked(mlService.forecastDemand).mockResolvedValue([{ date: '2026-01-20', demand: 15 }]);
    const req = { tenant_id: 'test', query: { days: '7' } };
    const res = { json: vi.fn() };
    const next = vi.fn();
    const handlers = mlController.getDemandForecast;
    handlers[1](req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith([{ date: '2026-01-20', demand: 15 }]);
  });

  it('calls next with validation error', async () => {
    vi.mocked(validator.validateDemandForecast).mockReturnValue({ valid: false, errors: ['Invalid days'] });
    const req = { query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();
    const handlers = mlController.getDemandForecast;
    handlers[1](req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('getOptimalSchedules', () => {
  it('returns optimal schedules', async () => {
    vi.mocked(mlService.analyzeOptimalSchedules).mockResolvedValue({ recommendations: [] });
    const req = { tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();
    mlController.getOptimalSchedules(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ recommendations: [] });
  });
});

describe('analyzeVitals', () => {
  it('returns vitals analysis', async () => {
    vi.mocked(validator.validateVitalSignsAnalysis).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(validator.sanitizeMLInput).mockReturnValue({ vitalSigns: { heartRate: 80 } });
    vi.mocked(mlService.analyzeVitalSigns).mockResolvedValue({ anomalies: [] });
    const req = { tenant_id: 'test', body: { vitalSigns: { heartRate: 80 } } };
    const res = { json: vi.fn() };
    const next = vi.fn();
    const handlers = mlController.analyzeVitals;
    handlers[1](req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ anomalies: [] });
  });

  it('calls next with validation error', async () => {
    vi.mocked(validator.validateVitalSignsAnalysis).mockReturnValue({ valid: false, errors: ['vitalSigns es requerido'] });
    const req = { body: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();
    const handlers = mlController.analyzeVitals;
    handlers[1](req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('getPredictionHistory', () => {
  it('returns history', async () => {
    vi.mocked(mlService.getPredictionHistory).mockResolvedValue([{ id: 1, model_type: 'noShow' }]);
    const req = { query: { modelType: 'noShow', limit: '10' }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();
    mlController.getPredictionHistory(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1, model_type: 'noShow' }], count: 1 });
  });
});

describe('getModelMetricsHistory', () => {
  it('returns metrics history', async () => {
    vi.mocked(mlService.getModelMetricsHistory).mockResolvedValue([{ id: 1, model_type: 'noShow' }]);
    const req = { query: {}, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();
    mlController.getModelMetricsHistory(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1, model_type: 'noShow' }], count: 1 });
  });
});

describe('getDemandForecastHistory', () => {
  it('returns forecast history', async () => {
    vi.mocked(mlService.getDemandForecastHistory).mockResolvedValue([{ id: 1, forecast_date: '2026-01-20' }]);
    const req = { query: {}, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();
    mlController.getDemandForecastHistory(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1, forecast_date: '2026-01-20' }], count: 1 });
  });
});

describe('exportPredictionData', () => {
  it('exports as JSON', async () => {
    vi.mocked(mlService.getPredictionHistory).mockResolvedValue([{ id: 1, model_type: 'noShow' }]);
    const req = { query: { format: 'json' }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();
    mlController.exportPredictionData(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalled();
  });

  it('exports as CSV', async () => {
    vi.mocked(mlService.getPredictionHistory).mockResolvedValue([{ id: 1, model_type: 'noShow', confidence: 0.9, doctor_id: 1, user_id: 2, booking_id: 3 }]);
    const req = { query: { format: 'csv' }, tenant_id: 'test' };
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() };
    const next = vi.fn();
    mlController.exportPredictionData(req, res, next);
    await flush();
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('handles empty CSV export', async () => {
    vi.mocked(mlService.getPredictionHistory).mockResolvedValue([]);
    const req = { query: { format: 'csv' }, tenant_id: 'test' };
    const res = { status: vi.fn().mockReturnThis(), send: vi.fn() };
    const next = vi.fn();
    mlController.exportPredictionData(req, res, next);
    await flush();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('No data available');
  });
});

describe('exportMetricsData', () => {
  it('exports as JSON', async () => {
    vi.mocked(mlService.getModelMetricsHistory).mockResolvedValue([{ id: 1, model_type: 'noShow' }]);
    const req = { query: {}, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();
    mlController.exportMetricsData(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalled();
  });

  it('exports as CSV', async () => {
    vi.mocked(mlService.getModelMetricsHistory).mockResolvedValue([{ id: 1, model_type: 'noShow', accuracy: 0.95 }]);
    const req = { query: { format: 'csv' }, tenant_id: 'test' };
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() };
    const next = vi.fn();
    mlController.exportMetricsData(req, res, next);
    await flush();
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
  });

  it('handles empty CSV export', async () => {
    vi.mocked(mlService.getModelMetricsHistory).mockResolvedValue([]);
    const req = { query: { format: 'csv' }, tenant_id: 'test' };
    const res = { status: vi.fn().mockReturnThis(), send: vi.fn() };
    const next = vi.fn();
    mlController.exportMetricsData(req, res, next);
    await flush();
    expect(res.send).toHaveBeenCalledWith('No data available');
  });
});

describe('exportDemandForecastData', () => {
  it('exports as JSON', async () => {
    vi.mocked(mlService.getDemandForecastHistory).mockResolvedValue([{ id: 1, forecast_date: '2026-01-20' }]);
    const req = { query: {}, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();
    mlController.exportDemandForecastData(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalled();
  });

  it('exports as CSV', async () => {
    vi.mocked(mlService.getDemandForecastHistory).mockResolvedValue([{ id: 1, forecast_date: '2026-01-20', predicted_demand: 10, confidence: 0.8 }]);
    const req = { query: { format: 'csv' }, tenant_id: 'test' };
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() };
    const next = vi.fn();
    mlController.exportDemandForecastData(req, res, next);
    await flush();
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
  });

  it('handles empty CSV export', async () => {
    vi.mocked(mlService.getDemandForecastHistory).mockResolvedValue([]);
    const req = { query: { format: 'csv' }, tenant_id: 'test' };
    const res = { status: vi.fn().mockReturnThis(), send: vi.fn() };
    const next = vi.fn();
    mlController.exportDemandForecastData(req, res, next);
    await flush();
    expect(res.send).toHaveBeenCalledWith('No data available');
  });
});

describe('powerBiExport', () => {
  it('returns all ML data for PowerBI', async () => {
    vi.mocked(mlService.getPredictionHistory).mockResolvedValue([]);
    vi.mocked(mlService.getModelMetricsHistory).mockResolvedValue([]);
    vi.mocked(mlService.getDemandForecastHistory).mockResolvedValue([]);
    vi.mocked(mlService.getModelStatus).mockResolvedValue({ noShowModel: 'trained', demandModel: 'trained', vitalAnomalyModel: 'trained', cacheStats: { hits: 1, misses: 0, hitRate: '100%', size: 1 } });
    const req = { tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();
    mlController.powerBiExport(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      predictions: [],
      model_metrics: [],
      demand_forecasts: [],
      model_status: expect.any(Object),
    }));
  });
});
