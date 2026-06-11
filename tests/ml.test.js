import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as mlValidator from '../src/modules/ml/ml.validator.js';
import { mlCache } from '../src/modules/ml/ml.cache.js';
import { getMLMetrics, resetMLMetrics, trackTrainingMetric } from '../src/modules/ml/ml.middleware.js';


describe('ML Validator', () => {
  describe('validateNoShowPrediction', () => {
    it('should validate correct input', () => {
      const result = mlValidator.validateNoShowPrediction({
        doctorId: 1,
        userId: 2,
        date: '2026-05-10',
        time: '10:00'
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid date', () => {
      const result = mlValidator.validateNoShowPrediction({
        doctorId: 1,
        userId: 2,
        date: 'invalid-date',
        time: '10:00'
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid time format', () => {
      const result = mlValidator.validateNoShowPrediction({
        doctorId: 1,
        date: '2026-05-10',
        time: '25:00'
      });
      expect(result.valid).toBe(false);
    });

    it('should require date', () => {
      const result = mlValidator.validateNoShowPrediction({
        doctorId: 1
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateVitalSignsAnalysis', () => {
    it('should validate correct vital signs', () => {
      const result = mlValidator.validateVitalSignsAnalysis({
        vitalSigns: {
          pressure: '120/80',
          heartRate: 72,
          temperature: 36.5
        }
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid pressure format', () => {
      const result = mlValidator.validateVitalSignsAnalysis({
        vitalSigns: {
          pressure: 'invalid'
        }
      });
      expect(result.valid).toBe(false);
    });

    it('should reject out of range heart rate', () => {
      const result = mlValidator.validateVitalSignsAnalysis({
        vitalSigns: {
          heartRate: 250
        }
      });
      expect(result.valid).toBe(false);
    });

    it('should require vitalSigns', () => {
      const result = mlValidator.validateVitalSignsAnalysis({});
      expect(result.valid).toBe(false);
    });
  });

  describe('sanitizeMLInput', () => {
    it('should handle null input', () => {
      const result = mlValidator.sanitizeMLInput(null);
      expect(result).toEqual({});
    });
  });
});

describe('ML Cache', () => {
  beforeEach(() => {
    mlCache.clear();
  });

  it('should store and retrieve data', async () => {
    const key = 'test:key';
    const data = { test: 'value' };

    await mlCache.set(key, data);
    const result = await mlCache.get(key);

    expect(result).toEqual(data);
  });

  it('should return null for expired data', async () => {
    const key = 'test:expire';
    await mlCache.set(key, { data: 'test' }, 1);

    await new Promise(resolve => setTimeout(resolve, 10));

    const result = await mlCache.get(key);
    expect(result).toBeNull();
  });

  it('should track hits and misses', async () => {
    await mlCache.set('key1', 'value1');
    await mlCache.get('key1');
    await mlCache.get('nonexistent');

    const stats = mlCache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('should clear cache', async () => {
    await mlCache.set('key1', 'value1');
    await mlCache.set('key2', 'value2');

    const cleared = mlCache.clear();
    expect(cleared).toBe(2);
  });
});

describe('ML Metrics', () => {
  beforeEach(() => {
    resetMLMetrics();
  });

  it('should track training metrics', () => {
    trackTrainingMetric(true, 1000);
    trackTrainingMetric(true, 2000);
    trackTrainingMetric(false, 500);

    const metrics = getMLMetrics();
    expect(metrics.training.totalRuns).toBe(3);
    expect(metrics.training.success).toBe(2);
    expect(metrics.training.error).toBe(1);
  });

  it('should reset metrics', () => {
    trackTrainingMetric(true, 1000);
    resetMLMetrics();

    const metrics = getMLMetrics();
    expect(metrics.training.totalRuns).toBe(0);
  });
});

describe('validateDemandForecast', () => {
  it('should accept valid days', () => {
    const result = mlValidator.validateDemandForecast({ days: '7' });
    expect(result.valid).toBe(true);
    expect(result.days).toBe(7);
  });

  it('should use default for missing days', () => {
    const result = mlValidator.validateDemandForecast({});
    expect(result.valid).toBe(true);
    expect(result.days).toBe(7);
  });

  it('should reject out of range days', () => {
    const result = mlValidator.validateDemandForecast({ days: '100' });
    expect(result.valid).toBe(false);
  });

  it('should reject invalid days', () => {
    const result = mlValidator.validateDemandForecast({ days: 'abc' });
    expect(result.valid).toBe(false);
  });
});

describe('ML Cache advanced', () => {
  beforeEach(() => {
    mlCache.clear();
  });

  it('should invalidate keys by pattern', async () => {
    await mlCache.set('noShow:abc123', { risk: 0.5 });
    await mlCache.set('noShow:def456', { risk: 0.3 });
    await mlCache.set('demand:ghi789', { value: 10 });

    const count = await mlCache.invalidate('noShow');
    expect(count).toBe(2);

    const remaining = mlCache.getStats().size;
    expect(remaining).toBe(1);
  });

  it('should evict oldest when cache is full', async () => {
    for (let i = 0; i < 110; i++) {
      await mlCache.set(`key${i}`, `value${i}`);
    }
    const stats = mlCache.getStats();
    expect(stats.size).toBeLessThanOrEqual(100);
  });

  it('should handle generateKey with different data types', () => {
    expect(mlCache.generateKey('test', 'string')).toBeTruthy();
    expect(mlCache.generateKey('test', { a: 1 })).toBeTruthy();
    expect(mlCache.generateKey('test', null)).toBeTruthy();
  });
});

describe('Validation edge cases', () => {
  it('validateNoShowPrediction should reject zero doctorId', () => {
    const result = mlValidator.validateNoShowPrediction({
      doctorId: 0,
      date: '2026-05-10',
      time: '10:00'
    });
    expect(result.valid).toBe(false);
  });

  it('validateDemandForecast should reject negative days', () => {
    const result = mlValidator.validateDemandForecast({ days: '-5' });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it('validateNoShowPrediction should reject invalid userId', () => {
    const result = mlValidator.validateNoShowPrediction({
      doctorId: 1, userId: 0,
      date: '2026-05-10', time: '10:00'
    });
    expect(result.valid).toBe(false);
  });

  it('validateNoShowPrediction should accept missing time', () => {
    const result = mlValidator.validateNoShowPrediction({
      doctorId: 1, date: '2026-05-10'
    });
    expect(result.valid).toBe(true);
  });

  it('validateVitalSignsAnalysis should accept missing fields', () => {
    const result = mlValidator.validateVitalSignsAnalysis({ vitalSigns: {} });
    expect(result.valid).toBe(true);
  });

  it('validateVitalSignsAnalysis should reject out of range systolic', () => {
    const result = mlValidator.validateVitalSignsAnalysis({
      vitalSigns: { pressure: '55/80' }
    });
    expect(result.valid).toBe(false);
  });

  it('validateVitalSignsAnalysis should reject out of range diastolic', () => {
    const result = mlValidator.validateVitalSignsAnalysis({
      vitalSigns: { pressure: '120/30' }
    });
    expect(result.valid).toBe(false);
  });

  it('validateVitalSignsAnalysis should reject out of range temperature', () => {
    const result = mlValidator.validateVitalSignsAnalysis({
      vitalSigns: { temperature: 50 }
    });
    expect(result.valid).toBe(false);
  });

  it('sanitizeMLInput should handle missing chief complaint', () => {
    const result = mlValidator.sanitizeMLInput({});
    expect(result).toEqual({});
  });

  it('sanitizeMLInput should sanitize vital signs', () => {
    const result = mlValidator.sanitizeMLInput({
      vitalSigns: { pressure: '120/80', heartRate: 72, temperature: 36.5 }
    });
    expect(result.vitalSigns).toBeDefined();
    expect(result.vitalSigns.pressure).toBe('120/80');
  });

  it('sanitizeMLInput should handle undefined vitalSigns', () => {
    const result = mlValidator.sanitizeMLInput({});
    expect(result).toEqual({});
  });

  it('sanitizeMLInput should handle non-string values in vitalSigns', () => {
    const result = mlValidator.sanitizeMLInput({
      vitalSigns: { pressure: 12345 }
    });
    expect(result.vitalSigns).toBeDefined();
    expect(result.vitalSigns.pressure).toBe('12345');
  });

  it('validateNoShowPrediction should accept missing doctorId and userId', () => {
    const result = mlValidator.validateNoShowPrediction({ date: '2026-05-10' });
    expect(result.valid).toBe(true);
  });

  it('sanitizeMLInput should handle vitalSigns without pressure', () => {
    const result = mlValidator.sanitizeMLInput({
      vitalSigns: { heartRate: 72 }
    });
    expect(result.vitalSigns.heartRate).toBe(72);
    expect(result.vitalSigns.pressure).toBeUndefined();
  });
});
