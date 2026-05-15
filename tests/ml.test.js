/**
 * Tests unitarios para Módulo ML/DL
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as mlValidator from '../src/modules/ml/ml.validator.js';
import { mlCache } from '../src/modules/ml/ml.cache.js';
import { getMLMetrics, resetMLMetrics, trackTrainingMetric } from '../src/modules/ml/ml.middleware.js';
import { getStopWords, tokenizeText, vectorizeDiagnosis } from '../src/modules/ml/ml.service.js';

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

  describe('validateDiagnosisClassification', () => {
    it('should validate correct chief complaint', () => {
      const result = mlValidator.validateDiagnosisClassification({
        chiefComplaint: 'Dolor de cabeza intenso'
      });
      expect(result.valid).toBe(true);
    });

    it('should reject short complaint', () => {
      const result = mlValidator.validateDiagnosisClassification({
        chiefComplaint: 'a'
      });
      expect(result.valid).toBe(false);
    });

    it('should reject missing complaint', () => {
      const result = mlValidator.validateDiagnosisClassification({});
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
    it('should sanitize chief complaint', () => {
      const result = mlValidator.sanitizeMLInput({
        chiefComplaint: '<script>alert("xss")</script> dolor de cabeza'
      });
      expect(result.chiefComplaint).not.toContain('<script>');
    });

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

describe('ML Text Utilities', () => {
  describe('getStopWords', () => {
    it('should return a non-empty set', () => {
      const words = getStopWords();
      expect(words.size).toBeGreaterThan(0);
    });

    it('should contain common Spanish stop words', () => {
      const words = getStopWords();
      expect(words.has('el')).toBe(true);
      expect(words.has('de')).toBe(true);
      expect(words.has('que')).toBe(true);
    });
  });

  describe('tokenizeText', () => {
    it('should lowercase and split text', () => {
      const tokens = tokenizeText('Fiebre y Cabeza Intenso');
      expect(tokens).toContain('fiebre');
      expect(tokens).toContain('cabeza');
      expect(tokens).toContain('intenso');
    });

    it('should remove stop words', () => {
      const tokens = tokenizeText('el fiebre de la cabeza');
      expect(tokens).not.toContain('el');
      expect(tokens).not.toContain('de');
      expect(tokens).not.toContain('la');
      expect(tokens).toContain('fiebre');
      expect(tokens).toContain('cabeza');
    });

    it('should strip punctuation', () => {
      const tokens = tokenizeText('¡Fiebre, intenso!');
      expect(tokens).toContain('fiebre');
      expect(tokens).toContain('intenso');
    });

    it('should filter short tokens', () => {
      const tokens = tokenizeText('ir a tu casa');
      expect(tokens.every(t => t.length > 2)).toBe(true);
    });

    it('should return empty array for empty input', () => {
      expect(tokenizeText('')).toEqual([]);
    });
  });

  describe('vectorizeDiagnosis', () => {
    const vocab = ['cabeza', 'fiebre', 'pecho'];
    const idf = [2.0, 1.8, 1.5];
    const maxVals = [2, 2, 1];

    it('should return a vector of vocab length', () => {
      const vector = vectorizeDiagnosis('cabeza fiebre', vocab, idf, maxVals);
      expect(vector).toHaveLength(vocab.length);
    });

    it('should compute non-zero for present terms', () => {
      const vector = vectorizeDiagnosis('cabeza cabeza fiebre', vocab, idf, maxVals);
      expect(vector[0]).toBeGreaterThan(0); // cabeza present (tf=2)
      expect(vector[1]).toBeGreaterThan(0); // fiebre present (tf=1)
      expect(vector[2]).toBe(0); // pecho absent
    });

    it('should handle empty text', () => {
      const vector = vectorizeDiagnosis('', vocab, idf, maxVals);
      expect(vector.every(v => v === 0)).toBe(true);
    });
  });
});