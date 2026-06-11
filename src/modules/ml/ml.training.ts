import { pool } from '../../shared/db.js';
import { logger } from '../../utils/logger.js';
import { mlCache } from './ml.cache.js';
import { trackTrainingMetric } from './ml.middleware.js';
import { noShowModel, setNoShowModel, demandModel, setDemandModel, vitalAnomalyModel, setVitalAnomalyModel, normalizeZScore } from './ml.shared.js';
import { saveModelMetrics } from './ml.monitoring.js';
import type { TrainingResult, TrainAllResults, StatisticalModel } from './ml.types.js';

const MIN_NOSHOW_SAMPLES = 50;
const MIN_DEMAND_SAMPLES = 28;
const MIN_VITALS_SAMPLES = 50;

export const trainNoShowModel = async (tenantId: string): Promise<TrainingResult> => {
  const startTime = Date.now();
  try {
    const cacheKey = `tenant:${tenantId}:model:noshow`;
    const cached = await mlCache.get(cacheKey) as { model: StatisticalModel } | null;
    if (cached) {
      setNoShowModel(cached.model);
      trackTrainingMetric(true, Date.now() - startTime);
      return { trained: true, cached: true };
    }

    const bookings = await pool.query(`
      SELECT b.status, u.no_show_count, d.specialty,
        EXTRACT(DOW FROM b.date) as day_of_week,
        EXTRACT(HOUR FROM b.time) as hour,
        (b.date - b.created_at::date) as days_advance
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN doctors d ON b.doctor_id = d.id
      WHERE b.date >= NOW() - INTERVAL '6 months'
        AND b.created_at IS NOT NULL
        AND b.tenant_id = $1
    `, [tenantId]);

    if (bookings.rows.length < MIN_NOSHOW_SAMPLES) {
      trackTrainingMetric(false, Date.now() - startTime);
      return { trained: false, reason: 'insufficient_data', samples: bookings.rows.length };
    }

    const total = bookings.rows.length;
    const noShows = bookings.rows.filter(b => b.status === 'no_show').length;
    const baseRate = noShows / Math.max(1, total);

    const specialtyMap = new Map<string, number>();
    const specialtyNoShow = new Map<string, { total: number; noShow: number }>();
    bookings.rows.forEach((b: Record<string, unknown>) => {
      const spec = (b.specialty as string) || 'general';
      if (!specialtyMap.has(spec)) {
        specialtyMap.set(spec, specialtyMap.size);
        specialtyNoShow.set(spec, { total: 0, noShow: 0 });
      }
      const entry = specialtyNoShow.get(spec)!;
      entry.total++;
      if (b.status === 'no_show') entry.noShow++;
    });

    const dayOfWeekNoShow: number[] = Array(7).fill(0);
    const dayOfWeekTotal: number[] = Array(7).fill(0);
    bookings.rows.forEach((b: Record<string, unknown>) => {
      const dow = parseInt(String(b.day_of_week)) || 0;
      dayOfWeekTotal[dow]++;
      if (b.status === 'no_show') dayOfWeekNoShow[dow]++;
    });
    const dowRates = dayOfWeekTotal.map((t, i) => t > 0 ? dayOfWeekNoShow[i] / t : baseRate);

    const model: StatisticalModel = {
      trained: true,
      mean: [baseRate, ...Array.from(specialtyMap.keys()).length > 0 ? [0] : []],
      std: [Math.sqrt(baseRate * (1 - baseRate) / Math.max(1, total))],
      specialtyList: Array.from(specialtyMap.keys()),
    };

    setNoShowModel(model);
    await mlCache.set(cacheKey, { model }, 30 * 60 * 1000);
    await saveModelMetrics('noshow', Date.now() - startTime, total, undefined, undefined, undefined, tenantId);

    const duration = Date.now() - startTime;
    trackTrainingMetric(true, duration);
    return { trained: true, samples: total, duration };
  } catch (err) {
    logger.error('[ML] Error training No-Show model:', (err as Error).message);
    trackTrainingMetric(false, Date.now() - startTime);
    return { trained: false, error: (err as Error).message };
  }
};

export const trainDemandForecastModel = async (tenantId: string): Promise<TrainingResult> => {
  const startTime = Date.now();
  try {
    const cacheKey = `tenant:${tenantId}:model:demand`;
    const cached = await mlCache.get(cacheKey) as { model: StatisticalModel } | null;
    if (cached) {
      setDemandModel(cached.model);
      trackTrainingMetric(true, Date.now() - startTime);
      return { trained: true, cached: true };
    }

    const bookings = await pool.query(
      `SELECT date, COUNT(*)::int as count FROM bookings
       WHERE date >= NOW() - INTERVAL '6 months'
         AND status != 'cancelled'
         AND tenant_id = $1
       GROUP BY date ORDER BY date`,
      [tenantId]
    );

    if (bookings.rows.length < MIN_DEMAND_SAMPLES) {
      trackTrainingMetric(false, Date.now() - startTime);
      return { trained: false, reason: 'insufficient_data' };
    }

    const values = bookings.rows.map(b => parseInt(String(b.count)));
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance) || 1;

    const model: StatisticalModel = {
      trained: true,
      originalData: values,
      windowSize: 7,
      mean: [avg],
      std: [stdDev],
    };

    setDemandModel(model);
    await mlCache.set(cacheKey, { model }, 30 * 60 * 1000);
    await saveModelMetrics('demand', Date.now() - startTime, values.length, undefined, undefined, undefined, tenantId);

    const duration = Date.now() - startTime;
    trackTrainingMetric(true, duration);
    return { trained: true, dataPoints: values.length, duration };
  } catch (err) {
    logger.error('[ML] Error training demand model:', (err as Error).message);
    trackTrainingMetric(false, Date.now() - startTime);
    return { trained: false, error: (err as Error).message };
  }
};

export const trainVitalSignsAnomalyDetector = async (tenantId: string): Promise<TrainingResult> => {
  const startTime = Date.now();
  try {
    const cacheKey = `tenant:${tenantId}:model:vitals`;
    const cached = await mlCache.get(cacheKey) as { model: { mean: number[]; std: number[]; threshold: number; trained: boolean } } | null;
    if (cached) {
      setVitalAnomalyModel(cached.model);
      trackTrainingMetric(true, Date.now() - startTime);
      return { trained: true, cached: true };
    }

    const records = await pool.query(
      `SELECT vital_signs FROM clinical_records
       WHERE vital_signs IS NOT NULL AND vital_signs != '{}' AND tenant_id = $1`,
      [tenantId]
    );

    if (records.rows.length < MIN_VITALS_SAMPLES) {
      trackTrainingMetric(false, Date.now() - startTime);
      return { trained: false, reason: 'insufficient_data' };
    }

    const features: number[][] = records.rows
      .filter(r => r.vital_signs)
      .map(r => {
        const vs = r.vital_signs as Record<string, unknown> | undefined;
        if (!vs) return [120, 80, 70, 36.5];
        return [
          parseInt((vs.pressure as string)?.split('/')[0] || '120'),
          parseInt((vs.pressure as string)?.split('/')[1] || '80'),
          parseInt(String(vs.heartRate || '70')),
          parseFloat(String(vs.temperature || '36.5'))
        ];
      })
      .filter((f): f is number[] => f[0] > 0);

    if (features.length < MIN_VITALS_SAMPLES) {
      return { trained: false, reason: 'insufficient_valid_data' };
    }

    const mean = features.reduce((acc, f) => acc.map((v, i) => v + f[i]), [0, 0, 0, 0]).map(v => v / features.length);
    const std = features[0].map((_, i) => {
      const v = features.reduce((sum, f) => sum + Math.pow(f[i] - mean[i], 2), 0) / features.length;
      return Math.sqrt(v) || 1;
    });

    const model = { mean, std, threshold: 2.0, trained: true };
    setVitalAnomalyModel(model);
    await mlCache.set(cacheKey, { model }, 30 * 60 * 1000);
    await saveModelMetrics('vitals', Date.now() - startTime, features.length, undefined, undefined, undefined, tenantId);

    const duration = Date.now() - startTime;
    trackTrainingMetric(true, duration);
    return { trained: true, samples: features.length };
  } catch (err) {
    logger.error('[ML] Error training vital signs detector:', (err as Error).message);
    trackTrainingMetric(false, Date.now() - startTime);
    return { trained: false, error: (err as Error).message };
  }
};

export const trainAllModels = async (tenantId: string): Promise<TrainAllResults> => {
  const results: TrainAllResults = { noShow: { trained: false }, demand: { trained: false }, vitals: { trained: false }, totalDuration: 0 };
  const startTime = Date.now();
  try {
    const [noShow, demand, vitals] = await Promise.all([
      trainNoShowModel(tenantId),
      trainDemandForecastModel(tenantId),
      trainVitalSignsAnomalyDetector(tenantId)
    ]);
    results.noShow = noShow;
    results.demand = demand;
    results.vitals = vitals;
    results.totalDuration = Date.now() - startTime;
    return results;
  } catch (err) {
    logger.error('[ML] Error training all models:', (err as Error).message);
    return { ...results, error: (err as Error).message } as TrainAllResults;
  }
};
