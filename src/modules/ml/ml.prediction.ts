import { pool } from '../../shared/db.js';
import { logger } from '../../utils/logger.js';
import { mlCache } from './ml.cache.js';
import { noShowModel, demandModel, vitalAnomalyModel, isMLSimplified } from './ml.shared.js';
import { savePrediction, saveDemandForecast } from './ml.monitoring.js';
import { enqueueJob } from '../../shared/queue.service.js';
import type { PredictionResult, ForecastResult, ScheduleRecommendation, VitalSignsAnalysis } from './ml.types.js';

const predictWithStatistical = (history: number[], days: number, _windowSize: number): { value: number; method: string }[] => {
  const results: { value: number; method: string }[] = [];
  const avg = history.reduce((a, b) => a + b, 0) / history.length;
  const seasonality = [0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15];
  for (let i = 0; i < days; i++) {
    const ma7 = history.length >= 7 ? history.slice(-7).reduce((a, b) => a + b, 0) / 7 : avg;
    const ma14 = history.length >= 14 ? history.slice(-14).reduce((a, b) => a + b, 0) / 14 : ma7;
    const trend = (ma7 - ma14) / 14;
    const dayOfWeek = (new Date().getDay() + i) % 7;
    const predicted = Math.round((ma7 + trend * 7) * (seasonality[dayOfWeek] || 1.0));
    if (isNaN(predicted) || !isFinite(predicted)) {
      results.push({ value: Math.max(1, Math.round(avg || 10)), method: 'fallback' });
      history.push(avg || 10);
      continue;
    }
    results.push({ value: Math.max(1, predicted), method: 'moving_average' });
    history.push(predicted);
  }
  return results;
};

const calculateCardiovascularRisk = (systolic: number, diastolic: number, heartRate: number): { level: string; score: number; factors: string[] } => {
  const factors: string[] = [];
  let score = 0;
  if (systolic >= 180 || diastolic >= 120) { score += 3; factors.push('Hypertensive crisis'); }
  else if (systolic >= 160 || diastolic >= 100) { score += 2; factors.push('Stage 2 hypertension'); }
  else if (systolic >= 140 || diastolic >= 90) { score += 1; factors.push('Stage 1 hypertension'); }
  if (systolic >= 130 && systolic < 140) { score += 1; factors.push('Elevated'); }
  if (diastolic >= 80 && diastolic < 90) { score += 1; factors.push('Diastolic elevated'); }
  if (heartRate > 100) { score += 2; factors.push('Tachycardia'); }
  else if (heartRate < 60) { score += 1; factors.push('Bradycardia'); }
  if (systolic < 90) { score += 2; factors.push('Hypotension'); }
  let level = 'low';
  if (score >= 4) level = 'high';
  else if (score >= 2) level = 'medium';
  return { level, score, factors };
};

export const predictNoShow = async (
  doctorId: number | undefined,
  userId: number | undefined,
  date: string,
  time: string,
  bookingId: number | undefined,
  tenantId: string
): Promise<PredictionResult> => {
  if (!doctorId || !userId) return { risk: 0.3, confidence: 'low', reason: 'invalid_input' };

  const cacheKey = `tenant:${tenantId}:predict:noshow:${doctorId}:${userId}:${date}:${time}`;
  const cached = await mlCache.get(cacheKey) as PredictionResult | null;
  if (cached) return cached;

  try {
    const userResult = await pool.query(
      `SELECT u.no_show_count,
        (SELECT COUNT(*)::float FROM bookings b2 WHERE b2.user_id = u.id AND b2.date >= NOW() - INTERVAL '30 days') as user_bookings_month
       FROM users u WHERE u.id = $1 AND u.tenant_id = $2`,
      [userId, tenantId]
    );
    const user = userResult.rows[0] as Record<string, unknown> | undefined || {};

    const hour = parseInt(time?.split(':')[0]) || 9;
    const dayOfWeek = new Date(date).getDay();
    const noShowHistory = (user?.no_show_count as number) || 0;
    const userBookings = parseInt(String(user?.user_bookings_month)) || 0;

    const baseRate = noShowModel?.mean?.[0] ?? 0.3;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isEarlyMorning = hour < 10;
    const isLateAfternoon = hour >= 17;

    let risk = baseRate;
    if (noShowHistory > 0) risk += 0.1 * Math.min(noShowHistory, 5);
    if (userBookings === 0) risk += 0.05;
    if (isWeekend) risk += 0.05;
    if (isEarlyMorning) risk += 0.03;
    if (isLateAfternoon) risk += 0.04;

    risk = Math.max(0.05, Math.min(0.95, risk));
    const result: PredictionResult = {
      risk: Math.round(risk * 100) / 100,
      confidence: risk > 0.7 ? 'medium' : 'low',
      recommendation: risk > 0.7
        ? 'Consider sending extra reminders'
        : risk > 0.4
          ? 'Send reminder'
          : 'Normal follow-up',
    };

    await mlCache.set(cacheKey, result, 5 * 60 * 1000);
    await savePrediction('noshow', { doctorId, userId, date, time }, result as unknown as Record<string, unknown>, { doctorId, userId, bookingId }, tenantId);
    return result;
  } catch (err) {
    logger.error('[ML] Error predicting no-show:', (err as Error).message);
    return { risk: 0.5, confidence: 'low', error: (err as Error).message };
  }
};

export const forecastDemand = async (days = 7, tenantId: string): Promise<ForecastResult[]> => {
  if (!demandModel?.trained) {
    enqueueJob('ml:train', { tenantId }).catch((err) => {
      logger.error('[ML] Failed to queue training job', { error: (err as Error).message });
    });
    const defaultValues = [10, 12, 8, 15, 11, 9, 14];
    const avg = defaultValues.reduce((a, b) => a + b, 0) / defaultValues.length;
    const lastDate = new Date();
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(lastDate);
      date.setDate(date.getDate() + i + 1);
      return {
        date: date.toISOString().split('T')[0],
        predicted: Math.max(1, Math.round(avg + (i % 7) * 0.1 * avg)),
        confidence: 'low',
        reason: 'model_training_queued',
      };
    });
  }

  try {
    const values = demandModel!.originalData!;
    const stats = predictWithStatistical([...values], days, 7);
    const forecasts = stats.map((s, i) => {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + i + 1);
      return {
        date: nextDate.toISOString().split('T')[0],
        predicted: s.value,
        confidence: 'medium',
        reason: s.method,
      };
    });
    await saveDemandForecast(forecasts, tenantId);
    return forecasts;
  } catch (err) {
    logger.error('[ML] Error forecasting demand:', (err as Error).message);
    const hist = demandModel?.originalData || [10, 12, 8, 15, 11, 9, 14];
    const stats = predictWithStatistical([...hist], days, 7);
    return stats.map((s, i) => {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + i + 1);
      return { date: nextDate.toISOString().split('T')[0], predicted: s.value, confidence: 'low', reason: 'fallback' };
    });
  }
};

export const analyzeOptimalSchedules = async (tenantId: string): Promise<ScheduleRecommendation[]> => {
  try {
    const cacheKey = `tenant:${tenantId}:analysis:schedules`;
    const cached = await mlCache.get(cacheKey) as ScheduleRecommendation[] | null;
    if (cached) return cached;

    const bookings = await pool.query(
      `SELECT EXTRACT(DOW FROM date) as day, EXTRACT(HOUR FROM time) as hour,
        COUNT(*) as count, COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
       FROM bookings
       WHERE date >= NOW() - INTERVAL '3 months' AND tenant_id = $1
       GROUP BY EXTRACT(DOW FROM date), EXTRACT(HOUR FROM time)`,
      [tenantId]
    );

    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const hours = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
    const scheduleData: Record<number, Record<string, { demand: number; noShowRate: number }>> = {};
    for (let d = 1; d <= 5; d++) {
      scheduleData[d] = {};
      hours.forEach(h => { scheduleData[d][h] = { demand: 0, noShowRate: 0 }; });
    }

    bookings.rows.forEach((b: Record<string, unknown>) => {
      const day = parseInt(String(b.day));
      const hour = parseInt(String(b.hour));
      const cnt = parseInt(String(b.count));
      if (day >= 1 && day <= 5) {
        const hourStr = `${hour.toString().padStart(2, '0')}:00`;
        if (scheduleData[day][hourStr]) {
          scheduleData[day][hourStr] = {
            demand: cnt,
            noShowRate: cnt > 0 ? parseInt(String(b.cancelled)) / cnt : 0,
          };
        }
      }
    });

    const recommendations: ScheduleRecommendation[] = [];
    for (let day = 1; day <= 5; day++) {
      let bestHour = '10:00';
      let bestScore = -1;
      Object.entries(scheduleData[day]).forEach(([hour, data]) => {
        const score = data.demand * (1 - data.noShowRate);
        if (score > bestScore) { bestScore = score; bestHour = hour; }
      });
      recommendations.push({
        day: days[day],
        bestTime: bestHour,
        occupancy: Math.min(100, Math.round(bestScore * 10) || 50),
        factors: scheduleData[day],
      });
    }

    await mlCache.set(cacheKey, recommendations, 15 * 60 * 1000);
    return recommendations;
  } catch (err) {
    logger.error('[ML] Error analyzing schedules:', (err as Error).message);
    return [];
  }
};

export const analyzeVitalSigns = async (
  vitalSigns: Record<string, unknown> | undefined,
  tenantId: string
): Promise<VitalSignsAnalysis> => {
  if (!vitalAnomalyModel?.trained) {
    enqueueJob('ml:train', { tenantId }).catch((err) => {
      logger.error('[ML] Failed to queue training job', { error: (err as Error).message });
    });
    return {
      anomaly: false, score: 0, warnings: [],
      values: { systolic: 120, diastolic: 80, heartRate: 70, temp: 36.5 },
      normalRanges: { systolic: { min: 0, max: 0 }, diastolic: { min: 0, max: 0 }, heartRate: { min: 0, max: 0 }, temperature: { min: '0', max: '0' } },
      reason: 'model_training_queued',
    };
  }

  try {
    const vs = vitalSigns || {};
    const systolic = parseInt((vs.pressure as string)?.split('/')[0] || '120');
    const diastolic = parseInt((vs.pressure as string)?.split('/')[1] || '80');
    const heartRate = parseInt(String(vs.heartRate || '70'));
    const temp = parseFloat(String(vs.temperature || '36.5'));
    const values = [systolic, diastolic, heartRate, temp];
    const zScores = values.map((v, i) => Math.abs((v - vitalAnomalyModel!.mean![i]) / vitalAnomalyModel!.std![i]));
    const maxScore = Math.max(...zScores);
    const isAnomaly = maxScore > vitalAnomalyModel!.threshold!;
    const warnings: string[] = [];
    if (zScores[0] > vitalAnomalyModel!.threshold!) warnings.push('Systolic pressure abnormal');
    if (zScores[1] > vitalAnomalyModel!.threshold!) warnings.push('Diastolic pressure abnormal');
    if (zScores[2] > vitalAnomalyModel!.threshold!) warnings.push('Heart rate abnormal');
    if (zScores[3] > vitalAnomalyModel!.threshold!) warnings.push('Temperature abnormal');

    const cvRisk = calculateCardiovascularRisk(systolic, diastolic, heartRate);
    if (["high", "medium"].includes(cvRisk.level)) {
      warnings.push(`Cardiovascular risk: ${cvRisk.level} (score: ${cvRisk.score})`);
      warnings.push(...cvRisk.factors);
    }

    return {
      anomaly: isAnomaly || cvRisk.level === 'high',
      score: Math.round(maxScore * 100) / 100,
      warnings,
      values: { systolic, diastolic, heartRate, temp },
      normalRanges: {
        systolic: { min: Math.round(vitalAnomalyModel!.mean![0] - 2 * vitalAnomalyModel!.std![0]), max: Math.round(vitalAnomalyModel!.mean![0] + 2 * vitalAnomalyModel!.std![0]) },
        diastolic: { min: Math.round(vitalAnomalyModel!.mean![1] - 2 * vitalAnomalyModel!.std![1]), max: Math.round(vitalAnomalyModel!.mean![1] + 2 * vitalAnomalyModel!.std![1]) },
        heartRate: { min: Math.round(vitalAnomalyModel!.mean![2] - 2 * vitalAnomalyModel!.std![2]), max: Math.round(vitalAnomalyModel!.mean![2] + 2 * vitalAnomalyModel!.std![2]) },
        temperature: { min: (vitalAnomalyModel!.mean![3] - 2 * vitalAnomalyModel!.std![3]).toFixed(1), max: (vitalAnomalyModel!.mean![3] + 2 * vitalAnomalyModel!.std![3]).toFixed(1) },
      },
      cardiovascularRisk: cvRisk.level,
      cardiovascularFactors: cvRisk.factors,
    };
  } catch (err) {
    logger.error('[ML] Error analyzing vital signs:', (err as Error).message);
    return {
      anomaly: false, score: 0, warnings: [],
      values: { systolic: 120, diastolic: 80, heartRate: 70, temp: 36.5 },
      normalRanges: { systolic: { min: 0, max: 0 }, diastolic: { min: 0, max: 0 }, heartRate: { min: 0, max: 0 }, temperature: { min: '0', max: '0' } },
      error: (err as Error).message,
    };
  }
};
