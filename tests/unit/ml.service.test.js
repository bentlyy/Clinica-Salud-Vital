import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }));
const mockMlCache = vi.hoisted(() => ({
  get: vi.fn(), set: vi.fn(), clear: vi.fn(), invalidate: vi.fn(),
  getStats: vi.fn(() => ({ hits: 0, misses: 0, hitRate: '0%', size: 0 })),
  generateKey: vi.fn(),
}));
const mockTrackTrainingMetric = vi.hoisted(() => vi.fn());

vi.mock('../../src/shared/db.js', () => ({ pool: { query: mockQuery } }));
vi.mock('../../src/utils/logger.js', () => ({ logger: mockLogger }));
vi.mock('../../src/modules/ml/ml.cache.js', () => ({ mlCache: mockMlCache }));
vi.mock('../../src/modules/ml/ml.middleware.js', () => ({ trackTrainingMetric: mockTrackTrainingMetric }));

vi.mock('@tensorflow/tfjs', () => ({
  tensor2d: vi.fn(() => ({ data: () => Promise.resolve(new Float32Array([1])), dispose: vi.fn() })),
  tensor3d: vi.fn(() => ({ data: () => Promise.resolve(new Float32Array([1])), dispose: vi.fn() })),
  sequential: vi.fn(() => ({
    add: vi.fn(),
    compile: vi.fn(),
    fit: vi.fn().mockResolvedValue({}),
    predict: vi.fn(() => ({ data: () => Promise.resolve(new Float32Array([0.5])), dispose: vi.fn() })),
    dispose: vi.fn(),
  })),
  layers: {
    dense: vi.fn(() => ({ units: 1 })),
    lstm: vi.fn(() => ({ units: 1 })),
  },
  train: { adam: vi.fn(() => ({})) },
}));

import {
  getStopWords, tokenizeText, vectorizeDiagnosis,
  savePrediction, saveModelMetrics, saveDemandForecast,
  getPredictionHistory, getModelMetricsHistory, getDemandForecastHistory,
  getModelStatus, disposeAllModels, trainAllModels,
  trainNoShowModel, predictNoShow,
  trainDiagnosisClassifier, predictDiagnosis,
  trainDemandForecastModel, forecastDemand,
  analyzeOptimalSchedules, analyzeVitalSigns, trainVitalSignsAnomalyDetector,
} from '../../src/modules/ml/ml.service.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
  mockMlCache.get.mockReset();
  mockMlCache.set.mockReset();
  disposeAllModels();
});

function makeBookingRow(i = 0, overrides = {}) {
  return {
    id: i, doctor_id: 1, user_id: 1, date: '2026-01-01',
    time: '10:00', status: i < 3 ? 'no_show' : 'completed',
    no_show_count: i < 3 ? 2 : 0, blocked_until: null,
    specialty: 'general', day_of_week: 1, hour: 10, month: 1,
    days_advance: 7, user_bookings_month: 2,
    ...overrides,
  };
}

function makeClinicalRecordRow(i = 0) {
  return {
    chief_complaint: 'dolor de cabeza',
    diagnosis: i < 3 ? 'Migraña' : 'Cefalea tensional',
  };
}

// ─── Pure utility functions ───────────────────────────────────────────────

describe('getStopWords', () => {
  it('returns a set of stop words', () => {
    const words = getStopWords();
    expect(words).toBeInstanceOf(Set);
    expect(words.has('el')).toBe(true);
    expect(words.has('noexisteword')).toBe(false);
  });
});

describe('tokenizeText', () => {
  it('tokenizes text removing stop words and short words', () => {
    expect(tokenizeText('El paciente tiene dolor')).toEqual(['paciente', 'dolor']);
  });

  it('removes punctuation and filters short tokens', () => {
    expect(tokenizeText('Hola, cómo estás? Bien.')).toEqual(['hola', 'est', 'bien']);
  });

  it('returns empty array for stop words only', () => {
    expect(tokenizeText('el la de')).toEqual([]);
  });

  it('handles empty string', () => {
    expect(tokenizeText('')).toEqual([]);
  });
});

describe('vectorizeDiagnosis', () => {
  it('returns normalized vector', () => {
    const result = vectorizeDiagnosis('dolor cabeza', ['dolor', 'cabeza', 'fiebre'], [2, 1.5, 1], [2, 1.5, 1]);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(1);
    expect(result[2]).toBe(0);
  });
});

// ─── DB wrapper functions ─────────────────────────────────────────────────

describe('savePrediction', () => {
  it('inserts prediction without tenant_id', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await savePrediction('no-show', { doctorId: 1 }, { risk: 0.5 }, { doctorId: 1 }, undefined);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO ml_prediction_history'), expect.arrayContaining(['no-show']));
  });

  it('inserts prediction with tenant_id', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await savePrediction('no-show', { doctorId: 1 }, { risk: 0.5 }, { doctorId: 1 }, 'tenant-1');
    expect(mockQuery).toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    await savePrediction('test', {}, {}, undefined, undefined);
    expect(mockLogger.error).toHaveBeenCalled();
  });
});

describe('saveModelMetrics', () => {
  it('inserts metrics without tenant_id', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await saveModelMetrics('no-show', 100, 50, 0.95, 0.1, undefined, undefined);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO ml_model_metrics'), expect.arrayContaining(['no-show']));
  });

  it('inserts metrics with error', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await saveModelMetrics('no-show', 0, 0, undefined, undefined, 'Training failed', 'tenant-1');
    expect(mockQuery).toHaveBeenCalled();
  });

  it('inserts metrics with success status', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await saveModelMetrics('no-show', 100, 50, undefined, undefined, undefined, undefined);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO ml_model_metrics'), expect.arrayContaining(['no-show', 100, 50]));
  });

  it('handles errors gracefully', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    await saveModelMetrics('test', 0, 0);
    expect(mockLogger.error).toHaveBeenCalled();
  });
});

describe('saveDemandForecast', () => {
  it('inserts forecasts without tenant_id', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await saveDemandForecast([{ date: '2024-01-01', predicted: 10, confidence: 'high' }], undefined);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO ml_demand_forecast'), expect.arrayContaining(['2024-01-01']));
  });

  it('inserts forecasts with tenant_id', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await saveDemandForecast([{ date: '2024-01-02', predicted: 5, confidence: 'medium' }], 'tenant-1');
    expect(mockQuery).toHaveBeenCalled();
  });

  it('handles multiple forecasts', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await saveDemandForecast([
      { date: '2024-01-01', predicted: 10, confidence: 'high' },
      { date: '2024-01-02', predicted: 5, confidence: 'medium' },
    ], undefined);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('handles errors gracefully', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    await saveDemandForecast([{ date: '2024-01-01', predicted: 1, confidence: 'low' }], undefined);
    expect(mockLogger.error).toHaveBeenCalled();
  });
});

describe('getPredictionHistory', () => {
  it('returns all when no filter', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });
    expect(await getPredictionHistory()).toEqual([{ id: 1 }]);
  });

  it('filters by modelType', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getPredictionHistory('no-show', 50, undefined);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE model_type = $1'), ['no-show', 50]);
  });

  it('filters by tenantId', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getPredictionHistory(undefined, 50, 'tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE tenant_id = $1'), ['tenant-1', 50]);
  });

  it('filters by both', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getPredictionHistory('no-show', 50, 'tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE model_type = $1 AND tenant_id = $2'), ['no-show', 'tenant-1', 50]);
  });

  it('returns empty array on error', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    expect(await getPredictionHistory()).toEqual([]);
  });
});

describe('getModelMetricsHistory', () => {
  it('returns all when no filter', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });
    expect(await getModelMetricsHistory()).toEqual([{ id: 1 }]);
  });

  it('filters by modelType', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getModelMetricsHistory('no-show', 50, undefined);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE model_type = $1'), ['no-show', 50]);
  });

  it('filters by tenantId', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getModelMetricsHistory(undefined, 50, 'tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE tenant_id = $1'), ['tenant-1', 50]);
  });

  it('filters by both', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getModelMetricsHistory('diagnosis', 10, 'tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('AND tenant_id = $2'), ['diagnosis', 'tenant-1', 10]);
  });

  it('returns empty array on error', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    expect(await getModelMetricsHistory()).toEqual([]);
  });
});

describe('getDemandForecastHistory', () => {
  it('returns all when no filter', async () => {
    mockQuery.mockResolvedValue({ rows: [{ date: '2024-01-01' }] });
    const result = await getDemandForecastHistory();
    expect(result).toEqual([{ date: '2024-01-01' }]);
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM ml_demand_forecast ORDER BY date DESC LIMIT $1', [30]);
  });

  it('filters by startDate and endDate', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getDemandForecastHistory('2024-01-01', '2024-01-31', 30, undefined);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE date BETWEEN'), ['2024-01-01', '2024-01-31', 30]);
  });

  it('filters by date range only', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getDemandForecastHistory('2024-01-01', '2024-01-31', 30, undefined);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE date BETWEEN'), expect.any(Array));
  });

  it('filters by tenantId', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getDemandForecastHistory(undefined, undefined, 30, 'tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE tenant_id = $1'), ['tenant-1', 30]);
  });

  it('filters by both date and tenantId', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getDemandForecastHistory('2024-01-01', '2024-01-31', 30, 'tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE date BETWEEN $1 AND $2 AND tenant_id = $3'), ['2024-01-01', '2024-01-31', 'tenant-1', 30]);
  });

  it('returns empty array on error', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    expect(await getDemandForecastHistory()).toEqual([]);
  });
});

// ─── Simple state functions ───────────────────────────────────────────────

describe('getModelStatus', () => {
  it('returns not_trained after disposeAllModels', async () => {
    const status = await getModelStatus('tenant-1');
    expect(status.noShowModel).toBe('not_trained');
    expect(status.diagnosisModel).toBe('not_trained');
    expect(status.demandModel).toBe('not_trained');
    expect(status.vitalAnomalyModel).toBe('not_trained');
    expect(status).toHaveProperty('cacheStats');
  });
});

describe('disposeAllModels', () => {
  it('disposes all models', () => {
    disposeAllModels();
    expect(mockLogger.info).toHaveBeenCalledWith('[ML] All models disposed');
  });
});

// ─── Training: No-Show ────────────────────────────────────────────────────

describe('trainNoShowModel', () => {
  it('returns not trained with insufficient data', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    mockMlCache.get.mockResolvedValue(null);
    const result = await trainNoShowModel('tenant-1');
    expect(result.trained).toBe(false);
  });

  it('returns cached model when available', async () => {
    const cachedModel = { trained: true, dispose: vi.fn(), add: vi.fn(), compile: vi.fn(), fit: vi.fn() };
    mockMlCache.get.mockResolvedValue({ model: cachedModel });
    const result = await trainNoShowModel('tenant-1');
    expect(result.trained).toBe(true);
    expect(result.cached).toBe(true);
    expect(mockTrackTrainingMetric).toHaveBeenCalledWith(true, expect.any(Number));
  });

  it('trains with sufficient booking data', async () => {
    const bookings = Array.from({ length: 15 }, (_, i) => makeBookingRow(i));
    mockQuery.mockResolvedValue({ rows: bookings });
    mockMlCache.get.mockResolvedValue(null);
    mockMlCache.set.mockResolvedValue(undefined);
    const result = await trainNoShowModel('tenant-1');
    expect(result.trained).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM bookings'), ['tenant-1']);
  });

  it('trains without tenant_id', async () => {
    const bookings = Array.from({ length: 10 }, (_, i) => makeBookingRow(i));
    mockQuery.mockResolvedValue({ rows: bookings });
    mockMlCache.get.mockResolvedValue(null);
    mockMlCache.set.mockResolvedValue(undefined);
    const result = await trainNoShowModel();
    expect(result.trained).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM bookings'), []);
  });

  it('handles training error gracefully', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    mockMlCache.get.mockResolvedValue(null);
    const result = await trainNoShowModel('tenant-1');
    expect(result.trained).toBe(false);
    expect(result).toHaveProperty('error');
  });
});

// ─── Prediction: No-Show ───────────────────────────────────────────────────

describe('predictNoShow', () => {
  it('returns invalid_input for missing userId', async () => {
    const result = await predictNoShow(1, undefined, '2026-01-01', '10:00', undefined, 'tenant-1');
    expect(result).toHaveProperty('reason', 'invalid_input');
  });

  it('returns fallback for missing model', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    mockMlCache.get.mockResolvedValue(null);
    const result = await predictNoShow(1, 2, '2026-01-01', '10:00', 1, 'tenant-1');
    expect(result).toHaveProperty('risk');
    expect(result).toHaveProperty('confidence');
  });

  it('returns cached prediction when available', async () => {
    mockMlCache.get.mockResolvedValue({ risk: 0.2, confidence: 'low' });
    const result = await predictNoShow(1, 2, '2026-01-01', '10:00', 1, 'tenant-1');
    expect(result).toHaveProperty('risk', 0.2);
  });

  it('uses trained model for prediction', async () => {
    const bookings = Array.from({ length: 15 }, (_, i) => makeBookingRow(i));
    mockQuery.mockResolvedValue({ rows: bookings });
    mockMlCache.get.mockResolvedValueOnce(null);
    mockMlCache.set.mockResolvedValue(undefined);
    await trainNoShowModel('tenant-1');
    mockMlCache.get.mockReset();
    mockMlCache.get.mockResolvedValue(null);

    mockQuery.mockResolvedValue({ rows: [{ no_show_count: 1, blocked_until: null, specialty: 'general', user_bookings_month: 3 }] });
    mockMlCache.set.mockResolvedValue(undefined);
    const result = await predictNoShow(1, 2, '2026-01-01', '10:00', 1, 'tenant-1');
    expect(result).toHaveProperty('risk');
    expect(result).toHaveProperty('confidence');
  });

  it('handles prediction error gracefully', async () => {
    disposeAllModels();
    mockQuery.mockRejectedValue(new Error('DB error'));
    mockMlCache.get.mockResolvedValue(null);
    const result = await predictNoShow(1, 2, '2026-01-01', '10:00', 1, 'tenant-1');
    expect(result).toHaveProperty('risk');
    expect(result).toHaveProperty('confidence');
  });
});

// ─── Training: Diagnosis ──────────────────────────────────────────────────

describe('trainDiagnosisClassifier', () => {
  it('returns not trained with insufficient data', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    mockMlCache.get.mockResolvedValue(null);
    const result = await trainDiagnosisClassifier('tenant-1');
    expect(result.trained).toBe(false);
  });

  it('returns cached model when available', async () => {
    const cachedModel = { trained: true, vocab: [], diagnoses: [], idf: [], maxVals: [], dispose: vi.fn() };
    mockMlCache.get.mockResolvedValue({ model: cachedModel });
    const result = await trainDiagnosisClassifier('tenant-1');
    expect(result.trained).toBe(true);
    expect(result.cached).toBe(true);
  });

  it('trains with sufficient data', async () => {
    const records = Array.from({ length: 10 }, (_, i) => {
      const diags = ['Migraña', 'Cefalea tensional', 'Amigdalitis'];
      return { chief_complaint: `dolor ${i % 2 === 0 ? 'cabeza fuerte' : 'garganta'}`, diagnosis: diags[i % 3] };
    });
    mockQuery.mockResolvedValue({ rows: records });
    mockMlCache.get.mockResolvedValue(null);
    mockMlCache.set.mockResolvedValue(undefined);
    const result = await trainDiagnosisClassifier('tenant-1');
    expect(result.trained).toBe(true);
  });

  it('trains with same diagnosis (falls back to insufficient variety)', async () => {
    const records = Array.from({ length: 10 }, () => ({
      chief_complaint: 'dolor de cabeza', diagnosis: 'Migraña'
    }));
    mockQuery.mockResolvedValue({ rows: records });
    mockMlCache.get.mockResolvedValue(null);
    const result = await trainDiagnosisClassifier('tenant-1');
    expect(result.trained).toBe(false);
    expect(result.reason).toBe('insufficient_variety');
  });

  it('handles training error gracefully', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    mockMlCache.get.mockResolvedValue(null);
    const result = await trainDiagnosisClassifier('tenant-1');
    expect(result.trained).toBe(false);
    expect(result).toHaveProperty('error');
  });
});

// ─── Prediction: Diagnosis ────────────────────────────────────────────────

describe('predictDiagnosis', () => {
  it('returns invalid input for short complaint', async () => {
    const result = await predictDiagnosis('a', 'tenant-1');
    expect(result).toHaveProperty('error', 'Invalid input');
  });

  it('returns no prediction when model not trained', async () => {
    disposeAllModels();
    const result = await predictDiagnosis('dolor de cabeza', 'tenant-1');
    expect(result.predictions).toEqual([]);
    expect(result).toHaveProperty('reason');
  });

  it('returns cached prediction when available', async () => {
    mockMlCache.get.mockResolvedValue({ predictions: [{ diagnosis: 'Migraña', confidence: 85 }] });
    const result = await predictDiagnosis('dolor de cabeza', 'tenant-1');
    expect(result.predictions).toHaveLength(1);
  });

  it('uses trained model for prediction', async () => {
    const records = Array.from({ length: 10 }, (_, i) => {
      const diags = ['Migraña', 'Cefalea tensional'];
      return { chief_complaint: `dolor ${i % 2 === 0 ? 'cabeza' : 'nuca'}`, diagnosis: diags[i % 2] };
    });
    mockQuery.mockResolvedValue({ rows: records });
    mockMlCache.get.mockResolvedValueOnce(null);
    mockMlCache.set.mockResolvedValue(undefined);
    await trainDiagnosisClassifier('tenant-1');

    mockMlCache.get.mockReset();
    mockMlCache.get.mockResolvedValue(null);
    const result = await predictDiagnosis('dolor de cabeza intenso', 'tenant-1');
    expect(result.predictions.length).toBeGreaterThan(0);
  });

  it('handles prediction error gracefully', async () => {
    disposeAllModels();
    mockQuery.mockRejectedValue(new Error('DB error'));
    mockMlCache.get.mockResolvedValue(null);
    const result = await predictDiagnosis('dolor de cabeza', 'tenant-1');
    expect(result.predictions).toEqual([]);
    expect(result).toHaveProperty('reason');
  });
});

// ─── Training: Demand Forecast ────────────────────────────────────────────

describe('trainDemandForecastModel', () => {
  it('returns not trained with insufficient data', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    mockMlCache.get.mockResolvedValue(null);
    const result = await trainDemandForecastModel('tenant-1');
    expect(result.trained).toBe(false);
  });

  it('returns cached model when available', async () => {
    const cachedModel = { trained: true, dispose: vi.fn(), add: vi.fn(), compile: vi.fn(), fit: vi.fn() };
    mockMlCache.get.mockResolvedValue({ model: cachedModel });
    const result = await trainDemandForecastModel('tenant-1');
    expect(result.trained).toBe(true);
    expect(result.cached).toBe(true);
  });

  it('trains with sufficient data (LSTM path)', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-01-${(i + 1).toString().padStart(2, '0')}`,
      count: 10 + (i % 5),
    }));
    mockQuery.mockResolvedValue({ rows });
    mockMlCache.get.mockResolvedValue(null);
    mockMlCache.set.mockResolvedValue(undefined);
    const result = await trainDemandForecastModel('tenant-1');
    expect(result.trained).toBe(true);
  });

  it('returns insufficient_sequences when not enough sequences', async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-01-${(i + 1).toString().padStart(2, '0')}`,
      count: 10,
    }));
    mockQuery.mockResolvedValue({ rows });
    mockMlCache.get.mockResolvedValue(null);
    const result = await trainDemandForecastModel('tenant-1');
    expect(result.trained).toBe(false);
  });

  it('handles training error gracefully', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    mockMlCache.get.mockResolvedValue(null);
    const result = await trainDemandForecastModel('tenant-1');
    expect(result.trained).toBe(false);
    expect(result).toHaveProperty('error');
  });
});

// ─── Forecast: Demand ─────────────────────────────────────────────────────

describe('forecastDemand', () => {
  it('returns fallback forecast when no model', async () => {
    disposeAllModels();
    mockQuery.mockResolvedValue({ rows: [] });
    mockMlCache.get.mockResolvedValue(null);
    const result = await forecastDemand(7, 'tenant-1');
    expect(result.length).toBe(7);
    expect(result[0]).toHaveProperty('reason');
  });

  it('returns cached model path for forecast', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-01-${(i + 1).toString().padStart(2, '0')}`,
      count: 10 + (i % 5),
    }));
    mockQuery.mockResolvedValue({ rows });
    mockMlCache.get.mockResolvedValueOnce(null);
    mockMlCache.set.mockResolvedValue(undefined);
    await trainDemandForecastModel('tenant-1');
    const result = await forecastDemand(7, 'tenant-1');
    expect(result.length).toBe(7);
    expect(result.every(f => f.date && f.predicted > 0)).toBe(true);
  });

  it('handles error by falling back to statistical', async () => {
    disposeAllModels();
    mockQuery.mockResolvedValue({ rows: [] });
    mockMlCache.get.mockResolvedValue(null);
    const result = await forecastDemand(3, 'tenant-1');
    expect(result.length).toBe(3);
  });
});

// ─── Optimal Schedules ────────────────────────────────────────────────────

describe('analyzeOptimalSchedules', () => {
  it('returns fallback schedules when no data', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await analyzeOptimalSchedules('tenant-1');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('day');
    expect(result[0]).toHaveProperty('bestTime');
  });

  it('uses cached data when available', async () => {
    const cached = [{ day: 'Lunes', bestTime: '10:00', occupancy: 80, factors: {} }];
    mockMlCache.get.mockResolvedValue(cached);
    const result = await analyzeOptimalSchedules('tenant-1');
    expect(result).toEqual(cached);
  });

  it('analyzes with booking data', async () => {
    const rows = [
      { day: 1, hour: 10, count: 10, cancelled: 2 },
      { day: 2, hour: 11, count: 8, cancelled: 1 },
      { day: 3, hour: 14, count: 12, cancelled: 0 },
    ];
    mockQuery.mockResolvedValue({ rows });
    mockMlCache.get.mockResolvedValue(null);
    const result = await analyzeOptimalSchedules('tenant-1');
    expect(result.length).toBe(5);
    expect(result[0]).toHaveProperty('day', 'Lunes');
  });

  it('handles error gracefully', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    const result = await analyzeOptimalSchedules('tenant-1');
    expect(result).toEqual([]);
  });
});

// ─── Training: Vital Signs ────────────────────────────────────────────────

describe('trainVitalSignsAnomalyDetector', () => {
  it('returns not trained when no data', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await trainVitalSignsAnomalyDetector('tenant-1');
    expect(result.trained).toBe(false);
  });

  it('returns cached model when available', async () => {
    const cachedModel = { mean: [120, 80, 70, 36.5], std: [10, 5, 10, 0.5], threshold: 2, trained: true };
    mockMlCache.get.mockResolvedValue({ model: cachedModel });
    const result = await trainVitalSignsAnomalyDetector('tenant-1');
    expect(result.trained).toBe(true);
    expect(result.cached).toBe(true);
  });

  it('trains with sufficient vital signs data', async () => {
    const rows = Array.from({ length: 25 }, () => ({
      vital_signs: { pressure: '120/80', heartRate: 72, temperature: 36.5 },
    }));
    mockQuery.mockResolvedValue({ rows });
    mockMlCache.get.mockResolvedValue(null);
    mockMlCache.set.mockResolvedValue(undefined);
    const result = await trainVitalSignsAnomalyDetector('tenant-1');
    expect(result.trained).toBe(true);
  });

  it('handles empty vital_signs objects', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({
      vital_signs: i % 2 === 0 ? { pressure: '120/80', heartRate: 72, temperature: 36.5 } : {},
    }));
    mockQuery.mockResolvedValue({ rows });
    mockMlCache.get.mockResolvedValue(null);
    mockMlCache.set.mockResolvedValue(undefined);
    const result = await trainVitalSignsAnomalyDetector('tenant-1');
    expect(result.trained).toBe(true);
  });

  it('handles training error gracefully', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    mockMlCache.get.mockResolvedValue(null);
    const result = await trainVitalSignsAnomalyDetector('tenant-1');
    expect(result.trained).toBe(false);
    expect(result).toHaveProperty('error');
  });
});

// ─── Analyze Vital Signs ──────────────────────────────────────────────────

describe('analyzeVitalSigns', () => {
  it('returns fallback for missing vitals', async () => {
    disposeAllModels();
    const result = await analyzeVitalSigns({}, 'tenant-1');
    expect(result).toHaveProperty('anomaly', false);
  });

  it('returns analysis with no model', async () => {
    disposeAllModels();
    const vitals = { systolic: 120, diastolic: 80, heartRate: 70, temp: 36.5 };
    const result = await analyzeVitalSigns(vitals, 'tenant-1');
    expect(result.anomaly).toBe(false);
  });

  it('analyzes with trained anomaly model', async () => {
    const rows = Array.from({ length: 25 }, () => ({
      vital_signs: { pressure: '120/80', heartRate: 72, temperature: 36.5 },
    }));
    mockQuery.mockResolvedValue({ rows });
    mockMlCache.get.mockResolvedValueOnce(null);
    mockMlCache.set.mockResolvedValue(undefined);
    await trainVitalSignsAnomalyDetector('tenant-1');
    const result = await analyzeVitalSigns({ pressure: '140/90', heartRate: 85, temperature: 37.0 }, 'tenant-1');
    expect(result).toHaveProperty('anomaly');
    expect(result).toHaveProperty('values');
  });

  it('analyzes with cardiovascular risk factors', async () => {
    const rows = Array.from({ length: 25 }, () => ({
      vital_signs: { pressure: '120/80', heartRate: 72, temperature: 36.5 },
    }));
    mockQuery.mockResolvedValue({ rows });
    mockMlCache.get.mockResolvedValueOnce(null);
    mockMlCache.set.mockResolvedValue(undefined);
    await trainVitalSignsAnomalyDetector('tenant-1');
    const result = await analyzeVitalSigns({ pressure: '180/120', heartRate: 110, temperature: 38.0 }, 'tenant-1');
    expect(result.cardiovascularRisk).toBeDefined();
  });

  it('handles error gracefully', async () => {
    disposeAllModels();
    mockQuery.mockRejectedValue(new Error('DB error'));
    mockMlCache.get.mockResolvedValue(null);
    const result = await analyzeVitalSigns({ pressure: '120/80', heartRate: 70, temperature: 36.5 }, 'tenant-1');
    expect(result).toHaveProperty('anomaly', false);
  });
});

// ─── Train All Models ─────────────────────────────────────────────────────

describe('trainAllModels', () => {
  it('trains all models with data', async () => {
    const bookings = Array.from({ length: 15 }, (_, i) => makeBookingRow(i));
    const crRows = Array.from({ length: 10 }, (_, i) => ({
      chief_complaint: `dolor ${i % 2 === 0 ? 'cabeza fuerte' : 'garganta'}`,
      diagnosis: i < 5 ? 'Migraña' : 'Cefalea',
    }));
    const demandRows = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-01-${(i + 1).toString().padStart(2, '0')}`,
      count: 10 + (i % 5),
    }));
    const vitalsRows = Array.from({ length: 25 }, () => ({
      vital_signs: { pressure: '120/80', heartRate: 72, temperature: 36.5 },
    }));
    mockQuery.mockResolvedValueOnce({ rows: bookings });
    mockQuery.mockResolvedValueOnce({ rows: crRows });
    mockQuery.mockResolvedValueOnce({ rows: demandRows });
    mockQuery.mockResolvedValueOnce({ rows: vitalsRows });
    mockMlCache.get.mockResolvedValue(null);
    mockMlCache.set.mockResolvedValue(undefined);
    const result = await trainAllModels('tenant-1');
    expect(result).toHaveProperty('noShow');
    expect(result).toHaveProperty('diagnosis');
    expect(result).toHaveProperty('demand');
    expect(result).toHaveProperty('vitals');
    expect(result).toHaveProperty('totalDuration');
  });

  it('returns error result when training fails', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    mockMlCache.get.mockResolvedValue(null);
    const result = await trainAllModels('tenant-1');
    expect(result.noShow.trained).toBe(false);
    expect(result.diagnosis.trained).toBe(false);
    expect(result.demand.trained).toBe(false);
    expect(result.vitals.trained).toBe(false);
    expect(result).toHaveProperty('totalDuration');
  });
});
