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
vi.mock('./ml.cache.js', () => ({ mlCache: mockMlCache }));
vi.mock('./ml.middleware.js', () => ({ trackTrainingMetric: mockTrackTrainingMetric }));

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
});

describe('getStopWords', () => {
  it('returns a set of stop words', () => {
    const words = getStopWords();
    expect(words).toBeInstanceOf(Set);
    expect(words.has('el')).toBe(true);
    expect(words.has('la')).toBe(true);
    expect(words.has('noexisteword')).toBe(false);
  });
});

describe('tokenizeText', () => {
  it('tokenizes text removing stop words and short words', () => {
    const result = tokenizeText('El paciente tiene dolor');
    expect(result).toEqual(['paciente', 'dolor']);
  });

  it('removes punctuation and filters short tokens', () => {
    const result = tokenizeText('Hola, cómo estás? Bien.');
    expect(result).toEqual(['hola', 'est', 'bien']);
  });

  it('returns empty array for stop words only', () => {
    const result = tokenizeText('el la de');
    expect(result).toEqual([]);
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

describe('savePrediction', () => {
  it('inserts prediction without tenant_id', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await savePrediction('no-show', { doctorId: 1 }, { risk: 0.5 }, { doctorId: 1 }, undefined);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ml_prediction_history'),
      expect.arrayContaining(['no-show'])
    );
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
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ml_model_metrics'),
      expect.arrayContaining(['no-show'])
    );
  });

  it('inserts metrics with error', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await saveModelMetrics('no-show', 0, 0, undefined, undefined, 'Training failed', 'tenant-1');
    expect(mockQuery).toHaveBeenCalled();
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
    const forecasts = [{ date: '2024-01-01', predicted: 10, confidence: 'high' }];
    await saveDemandForecast(forecasts, undefined);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ml_demand_forecast'),
      expect.arrayContaining(['2024-01-01'])
    );
  });

  it('inserts forecasts with tenant_id', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const forecasts = [{ date: '2024-01-02', predicted: 5, confidence: 'medium' }];
    await saveDemandForecast(forecasts, 'tenant-1');
    expect(mockQuery).toHaveBeenCalled();
  });

  it('handles multiple forecasts', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const forecasts = [
      { date: '2024-01-01', predicted: 10, confidence: 'high' },
      { date: '2024-01-02', predicted: 5, confidence: 'medium' },
    ];
    await saveDemandForecast(forecasts, undefined);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});

describe('getPredictionHistory', () => {
  it('returns all when no filter', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });
    const result = await getPredictionHistory(undefined, 100, undefined);
    expect(result).toEqual([{ id: 1 }]);
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM ml_prediction_history ORDER BY prediction_date DESC LIMIT $1',
      [100]
    );
  });

  it('filters by modelType', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getPredictionHistory('no-show', 50, undefined);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE model_type = $1'),
      ['no-show', 50]
    );
  });

  it('filters by tenantId', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getPredictionHistory(undefined, 50, 'tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE tenant_id = $1'),
      ['tenant-1', 50]
    );
  });

  it('filters by both modelType and tenantId', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getPredictionHistory('no-show', 50, 'tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE model_type = $1 AND tenant_id = $2'),
      ['no-show', 'tenant-1', 50]
    );
  });

  it('returns empty array on error', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    const result = await getPredictionHistory();
    expect(result).toEqual([]);
  });
});

describe('getModelMetricsHistory', () => {
  it('returns all when no filter', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });
    const result = await getModelMetricsHistory(undefined, 50, undefined);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('filters by modelType', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getModelMetricsHistory('no-show', 50, undefined);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE model_type = $1'),
      ['no-show', 50]
    );
  });

  it('filters by tenantId', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getModelMetricsHistory(undefined, 50, 'tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE tenant_id = $1'),
      ['tenant-1', 50]
    );
  });

  it('filters by both', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getModelMetricsHistory('diagnosis', 10, 'tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('AND tenant_id = $2'),
      ['diagnosis', 'tenant-1', 10]
    );
  });

  it('returns empty array on error', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    const result = await getModelMetricsHistory();
    expect(result).toEqual([]);
  });
});

describe('getDemandForecastHistory', () => {
  it('returns all when no filter', async () => {
    mockQuery.mockResolvedValue({ rows: [{ date: '2024-01-01' }] });
    const result = await getDemandForecastHistory(undefined, undefined, 30, undefined);
    expect(result).toEqual([{ date: '2024-01-01' }]);
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM ml_demand_forecast ORDER BY date DESC LIMIT $1',
      [30]
    );
  });

  it('filters by startDate and endDate', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getDemandForecastHistory('2024-01-01', '2024-01-31', 30, undefined);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE date BETWEEN'),
      ['2024-01-01', '2024-01-31', 30]
    );
  });

  it('filters by tenantId', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getDemandForecastHistory(undefined, undefined, 30, 'tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE tenant_id = $1'),
      ['tenant-1', 30]
    );
  });

  it('filters by startDate, endDate and tenantId', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getDemandForecastHistory('2024-01-01', '2024-01-31', 30, 'tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE date BETWEEN $1 AND $2 AND tenant_id = $3'),
      ['2024-01-01', '2024-01-31', 'tenant-1', 30]
    );
  });

  it('returns empty array on error', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    const result = await getDemandForecastHistory();
    expect(result).toEqual([]);
  });
});

describe('getModelStatus', () => {
  it('returns status for untrained models', async () => {
    const status = await getModelStatus('tenant-1');
    expect(status).toHaveProperty('noShowModel', 'not_trained');
    expect(status).toHaveProperty('diagnosisModel', 'not_trained');
    expect(status).toHaveProperty('demandModel', 'not_trained');
    expect(status).toHaveProperty('vitalAnomalyModel', 'not_trained');
    expect(status).toHaveProperty('cacheStats');
  });
});

describe('disposeAllModels', () => {
  it('disposes all models', () => {
    disposeAllModels('tenant-1');
    expect(mockLogger.info).toHaveBeenCalledWith('[ML] All models disposed');
  });
});

describe('trainNoShowModel', () => {
  it('returns not trained for no training data', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    mockMlCache.get.mockResolvedValue(null);
    const result = await trainNoShowModel('tenant-1');
    expect(result.trained).toBe(false);
  });
});

describe('predictNoShow', () => {
  it('returns low confidence for insufficient data', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await predictNoShow(1, 1, '2024-01-01', '10:00', 1, 'tenant-1');
    expect(result).toHaveProperty('risk');
    expect(result).toHaveProperty('confidence', 'low');
  });
});

describe('trainDiagnosisClassifier', () => {
  it('runs with insufficient data', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    mockMlCache.get.mockResolvedValue(null);
    const result = await trainDiagnosisClassifier('tenant-1');
    expect(result.trained).toBe(false);
  });
});

describe('predictDiagnosis', () => {
  it('returns no prediction when model not trained', async () => {
    const result = await predictDiagnosis('dolor de cabeza', 'tenant-1');
    expect(result.predictions).toEqual([]);
    expect(result).toHaveProperty('reason');
  });
});

describe('trainDemandForecastModel', () => {
  it('returns not trained when no data', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await trainDemandForecastModel('tenant-1');
    expect(result.trained).toBe(false);
  });
});

describe('forecastDemand', () => {
  it('returns fallback forecast when no model', async () => {
    const result = await forecastDemand(7, 'tenant-1');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('reason');
  });
});

describe('analyzeOptimalSchedules', () => {
  it('returns fallback schedules when no data', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await analyzeOptimalSchedules('tenant-1');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('day');
  });
});

describe('analyzeVitalSigns', () => {
  it('returns normal analysis when no model trained', async () => {
    const vitals = { systolic: 120, diastolic: 80, heartRate: 70, temp: 36.5 };
    const result = await analyzeVitalSigns(vitals, 'tenant-1');
    expect(result.anomaly).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it('returns fallback for missing vitals', async () => {
    const result = await analyzeVitalSigns({}, 'tenant-1');
    expect(result).toHaveProperty('anomaly', false);
  });
});

describe('trainVitalSignsAnomalyDetector', () => {
  it('returns not trained when no data', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await trainVitalSignsAnomalyDetector('tenant-1');
    expect(result.trained).toBe(false);
  });
});

describe('trainNoShowModel with data', () => {
  it('trains with sufficient booking data', async () => {
    const bookings = Array.from({ length: 15 }, (_, i) => ({
      id: i, doctor_id: 1, user_id: i, date: '2026-01-01',
      time: '10:00', status: i < 3 ? 'no_show' : 'completed',
      no_show_count: i < 3 ? 2 : 0, blocked_until: null,
      specialty: 'general', day_of_week: 1, hour: 10, month: 1,
      days_advance: 7, user_bookings_month: 2,
    }));
    mockQuery.mockResolvedValue({ rows: bookings });
    mockMlCache.get.mockResolvedValue(null);
    mockMlCache.set.mockResolvedValue(undefined);
    const result = await trainNoShowModel('tenant-1');
    expect(result.trained).toBe(true);
  });
});

describe('predictNoShow advanced', () => {
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
});

describe('analyzeVitalSigns with data', () => {
  it('analyzes with vital signs data', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await analyzeVitalSigns({
      systolic: 130, diastolic: 85, heartRate: 75, temp: 37.0
    }, 'tenant-1');
    expect(result).toHaveProperty('anomaly', false);
  });
});

describe('trainAllModels with data', () => {
  it('trains all models with data', async () => {
    const bookings = Array.from({ length: 15 }, (_, i) => ({
      id: i, doctor_id: 1, user_id: 1, date: '2026-01-01',
      time: '10:00', status: 'completed',
      no_show_count: 0, blocked_until: null,
      specialty: 'general', day_of_week: 1, hour: 10, month: 1,
      days_advance: 7, user_bookings_month: 1,
    }));
    mockQuery.mockResolvedValue({ rows: bookings });
    mockMlCache.get.mockResolvedValue(null);
    mockMlCache.set.mockResolvedValue(undefined);
    const result = await trainAllModels('tenant-1');
    expect(result).toHaveProperty('noShow');
    expect(result).toHaveProperty('diagnosis');
    expect(result).toHaveProperty('demand');
    expect(result).toHaveProperty('vitals');
    expect(result).toHaveProperty('totalDuration');
  });
});
