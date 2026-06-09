import { pool } from '../../shared/db.js';
import { logger } from '../../utils/logger.js';
import { mlCache } from './ml.cache.js';
import { noShowModel, diagnosisModel, demandModel, vitalAnomalyModel, getTF, safeDispose, setDemandModel, isMLSimplified } from './ml.shared.js';
import { vectorizeDiagnosis } from './ml.features.js';
import { savePrediction, saveDemandForecast } from './ml.monitoring.js';
import { enqueueJob } from '../../shared/queue.service.js';
import type { PredictionResult, DiagnosisPrediction, ForecastResult, ScheduleRecommendation, VitalSignsAnalysis, Tensor } from './ml.types.js';

const predictWithStatistical = (history: number[], days: number, windowSize: number): { value: number; method: string }[] => {
  const results: { value: number; method: string }[] = [];
  const avg = history.reduce((a, b) => a + b, 0) / history.length;
  const seasonality = [0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15];
  for (let i = 0; i < days; i++) {
    const ma7 = history.length >= 7 ? history.slice(-7).reduce((a, b) => a + b, 0) / 7 : avg;
    const ma14 = history.length >= 14 ? history.slice(-14).reduce((a, b) => a + b, 0) / 14 : ma7;
    const trend = (ma7 - ma14) / 14;
    const dayOfWeek = (new Date().getDay() + i) % 7;
    const predicted = Math.round((ma7 + trend * 7) * (seasonality[dayOfWeek] || 1.0));
    if (isNaN(predicted) || !isFinite(predicted)) { results.push({ value: Math.max(1, Math.round(avg || 10)), method: 'fallback' }); history.push(avg || 10); continue; }
    results.push({ value: Math.max(1, predicted), method: 'moving_average' });
    history.push(predicted);
  }
  return results;
};

const calculateCardiovascularRisk = (systolic: number, diastolic: number, heartRate: number): { level: string; score: number; factors: string[] } => {
  const factors: string[] = []; let score = 0;
  if (systolic >= 180 || diastolic >= 120) { score += 3; factors.push('Hypertensive crisis'); }
  else if (systolic >= 160 || diastolic >= 100) { score += 2; factors.push('Stage 2 hypertension'); }
  else if (systolic >= 140 || diastolic >= 90) { score += 1; factors.push('Stage 1 hypertension'); }
  if (systolic >= 130 && systolic < 140) { score += 1; factors.push('Elevated'); }
  if (diastolic >= 80 && diastolic < 90) { score += 1; factors.push('Diastolic elevated'); }
  if (heartRate > 100) { score += 2; factors.push('Tachycardia'); }
  else if (heartRate < 60) { score += 1; factors.push('Bradycardia'); }
  if (systolic < 90) { score += 2; factors.push('Hypotension'); }
  let level = 'low'; if (score >= 4) level = 'high'; else if (score >= 2) level = 'medium';
  return { level, score, factors };
};

export const predictNoShow = async (doctorId: number | undefined, userId: number | undefined, date: string, time: string, bookingId: number | undefined, tenantId: string): Promise<PredictionResult> => {
  if (!doctorId || !userId) return { risk: 0.3, confidence: 'low', reason: 'invalid_input' };
  const cacheKey = `tenant:${tenantId}:predict:noshow:${doctorId}:${userId}:${date}:${time}`;
  const cached = await mlCache.get(cacheKey) as PredictionResult | null;
  if (cached) return cached;
  if (!noShowModel || !noShowModel.trained) {
    enqueueJob('ml:train', { tenantId }).catch((err) => {
      logger.error('[ML] Failed to queue training job', { error: (err as Error).message });
    });
    return { risk: 0.3, confidence: 'low', reason: 'model_training_queued' };
  }
  try {
    const { tensor2d: tensor2d2 } = await getTF();
    const userResult = await pool.query(`SELECT u.no_show_count, u.blocked_until, d.specialty, (SELECT COUNT(*)::float FROM bookings b2 WHERE b2.user_id = u.id AND b2.date >= NOW() - INTERVAL '30 days') as user_bookings_month FROM users u LEFT JOIN doctors d ON d.user_id = u.id WHERE u.id = $1 AND u.tenant_id = $2`, [userId, tenantId]);
    const user = userResult.rows[0] as Record<string, unknown> || {};
    let doctorSpecialtyIdx = 0;
    const doctorResult = await pool.query('SELECT specialty FROM doctors WHERE id = $1 AND tenant_id = $2', [doctorId, tenantId]);
    if (doctorResult.rows.length > 0) { const idx = (noShowModel?.specialtyList || []).indexOf(doctorResult.rows[0].specialty); if (idx >= 0) doctorSpecialtyIdx = idx; }
    const bookingResult = await pool.query('SELECT created_at::date as created_date FROM bookings WHERE doctor_id = $1 AND user_id = $2 AND date = $3::date AND tenant_id = $4 LIMIT 1', [doctorId, userId, date, tenantId]);
    const bookingCreated = bookingResult.rows[0]?.created_date ? new Date(bookingResult.rows[0].created_date) : new Date();
    const daysAdvance = Math.max(1, Math.ceil((new Date(date).getTime() - bookingCreated.getTime()) / (1000 * 60 * 60 * 24)));
    const hour = parseInt(time?.split(':')[0]) || 9; const dayOfWeek = new Date(date).getDay(); const month = new Date(date).getMonth() + 1;
    const noShowHistory = (user?.no_show_count as number) || 0;
    const isBlocked = user?.blocked_until && new Date(user.blocked_until as string) > new Date() ? 1 : 0;
    const userBookings = parseInt(String(user?.user_bookings_month)) || 0;
    const rawFeatures = [hour / 24, dayOfWeek / 7, month / 12, noShowHistory / 10, isBlocked, Math.min(daysAdvance, 30) / 30, Math.min(userBookings, 10) / 10, doctorSpecialtyIdx / Math.max(1, 1), dayOfWeek === 1 ? 1 : 0, dayOfWeek === 5 ? 1 : 0, hour < 12 ? 1 : 0, hour >= 14 && hour < 18 ? 1 : 0];
    const mean = noShowModel?.mean || Array(12).fill(0); const std = noShowModel?.std || Array(12).fill(1);
    const features = rawFeatures.map((v, i) => (v - mean[i]) / std[i]);
    const input = tensor2d2([features]); const prediction = noShowModel!.predict(input);
    const risk = (await (prediction as Tensor).data())[0];
    safeDispose(input); safeDispose(prediction);
    const riskScore = Math.max(0.05, Math.min(0.95, risk));
    const result: PredictionResult = { risk: Math.round(riskScore * 100) / 100, confidence: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low', recommendation: riskScore > 0.7 ? 'Consider blocking booking or send extra reminders' : riskScore > 0.4 ? 'Send reminder' : 'Normal follow-up' };
    await mlCache.set(cacheKey, result, 5 * 60 * 1000);
    await savePrediction('noshow', { doctorId, userId, date, time, features: rawFeatures }, result as unknown as Record<string, unknown>, { doctorId, userId, bookingId }, tenantId);
    return result;
  } catch (err) { logger.error('[ML] Error predicting no-show:', (err as Error).message); return { risk: 0.5, confidence: 'low', error: (err as Error).message }; }
};

export const predictDiagnosis = async (chiefComplaint: string, tenantId: string): Promise<DiagnosisPrediction> => {
  if (!chiefComplaint || chiefComplaint.length < 2) return { predictions: [], error: 'Invalid input' };
  const cacheKey = tenantId ? `tenant:${tenantId}:predict:diagnosis:${chiefComplaint.substring(0, 50)}` : `predict:diagnosis:${chiefComplaint.substring(0, 50)}`;
  const cached = await mlCache.get(cacheKey) as DiagnosisPrediction | null;
  if (cached) return cached;
  if (!diagnosisModel || !diagnosisModel.trained) {
    enqueueJob('ml:train', { tenantId }).catch((err) => {
      logger.error('[ML] Failed to queue training job', { error: (err as Error).message });
    });
    return { predictions: [], reason: 'model_training_queued' };
  }
  try {
    const { tensor2d: tensor2d2 } = await getTF();
    const vocab = diagnosisModel!.vocab!; const idfWeights = diagnosisModel!.idf || vocab.map(() => 1); const maxVals = diagnosisModel!.maxVals || vocab.map(() => 1);
    const vector = vectorizeDiagnosis(chiefComplaint || '', vocab, idfWeights, maxVals);
    const input = tensor2d2([vector]); const prediction = diagnosisModel!.predict(input);
    const probabilities = await (prediction as Tensor).data();
    const top3 = Array.from(probabilities).map((prob, idx) => ({ diagnosis: diagnosisModel!.diagnoses![idx], probability: prob })).sort((a, b) => b.probability - a.probability).slice(0, 3);
    safeDispose(input); safeDispose(prediction);
    const result: DiagnosisPrediction = { predictions: top3.map(t => ({ diagnosis: t.diagnosis, confidence: Math.round(t.probability * 100) })) };
    await mlCache.set(cacheKey, result, 10 * 60 * 1000);
    return result;
  } catch (err) { logger.error('[ML] Error predicting diagnosis:', (err as Error).message); return { predictions: [], error: (err as Error).message }; }
};

export const forecastDemand = async (days = 7, tenantId: string): Promise<ForecastResult[]> => {
  if (isMLSimplified()) {
    const defaultValues = [10, 12, 8, 15, 11, 9, 14]; const avg = defaultValues.reduce((a, b) => a + b, 0) / defaultValues.length; const lastDate = new Date();
    return Array.from({ length: days }, (_, i) => { const date = new Date(lastDate); date.setDate(date.getDate() + i + 1); return { date: date.toISOString().split('T')[0], predicted: Math.max(1, Math.round(avg + (i % 7) * 0.1 * avg)), confidence: 'low', reason: 'simplified_mode' }; });
  }
  if (!demandModel || !demandModel.trained) {
    enqueueJob('ml:train', { tenantId }).catch((err) => {
      logger.error('[ML] Failed to queue training job', { error: (err as Error).message });
    });
    const defaultValues = [10, 12, 8, 15, 11, 9, 14];
    const avg = defaultValues.reduce((a, b) => a + b, 0) / defaultValues.length;
    const lastDate = new Date();
    return Array.from({ length: days }, (_, i) => { const date = new Date(lastDate); date.setDate(date.getDate() + i + 1); return { date: date.toISOString().split('T')[0], predicted: Math.max(1, Math.round(avg + (i % 7) * 0.1 * avg)), confidence: 'low', reason: 'model_training_queued' }; });
  }
  try {
    const windowSize = demandModel!.windowSize!; const values = demandModel!.originalData!; const isLSTM = demandModel!.lstmTrained;
    if (!isLSTM) {
      const stats = predictWithStatistical([...values], days, windowSize);
      const forecasts = stats.map((s, i) => { const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + i + 1); return { date: nextDate.toISOString().split('T')[0], predicted: s.value, confidence: 'medium', reason: s.method }; });
      await saveDemandForecast(forecasts, tenantId); return forecasts;
    }
    const { tensor3d } = await getTF(); const avg = demandModel!.mean![0]; const std = demandModel!.std![0];
    const normalized = values.map(v => (v - avg) / (std || 1)); let currentWindow = normalized.slice(-windowSize);
    const forecasts: ForecastResult[] = [];
    for (let i = 0; i < days; i++) {
      const input = tensor3d([currentWindow.map(v => [v])]); const pred = demandModel!.predict(input);
      const value = (await (pred as Tensor).data())[0]; safeDispose(input); safeDispose(pred);
      currentWindow = [...currentWindow.slice(1), value];
      const predictedValue = Math.max(1, Math.round(value * (std || 1) + avg));
      const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + i + 1);
      forecasts.push({ date: nextDate.toISOString().split('T')[0], predicted: predictedValue, confidence: i < 3 ? 'high' : i < 5 ? 'medium' : 'low' });
    }
    await saveDemandForecast(forecasts, tenantId); return forecasts;
  } catch (err) {
    logger.error('[ML] Error forecasting demand:', (err as Error).message);
    const hist = demandModel?.originalData || [10, 12, 8, 15, 11, 9, 14];
    const stats = predictWithStatistical([...hist], days, 7);
    return stats.map((s, i) => { const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + i + 1); return { date: nextDate.toISOString().split('T')[0], predicted: s.value, confidence: 'low', reason: 'fallback' }; });
  }
};

export const analyzeOptimalSchedules = async (tenantId: string): Promise<ScheduleRecommendation[]> => {
  logger.info('[ML] Analyzing optimal schedules...');
  try {
    const cacheKey = `tenant:${tenantId}:analysis:schedules`;
    const cached = await mlCache.get(cacheKey) as ScheduleRecommendation[] | null;
    if (cached) return cached;
    const bookings = await pool.query(`SELECT EXTRACT(DOW FROM date) as day, EXTRACT(HOUR FROM time) as hour, COUNT(*) as count, COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled FROM bookings WHERE date >= NOW() - INTERVAL '3 months' AND tenant_id = $1 GROUP BY EXTRACT(DOW FROM date), EXTRACT(HOUR FROM time)`, [tenantId]);
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const hours = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
    const scheduleData: Record<number, Record<string, { demand: number; noShowRate: number }>> = {};
    for (let d = 1; d <= 5; d++) { scheduleData[d] = {}; hours.forEach(h => { scheduleData[d][h] = { demand: 0, noShowRate: 0 }; }); }
    bookings.rows.forEach((b: Record<string, unknown>) => {
      const day = parseInt(String(b.day)); const hour = parseInt(String(b.hour)); const cnt = parseInt(String(b.count));
      if (day >= 1 && day <= 5) { const hourStr = `${hour.toString().padStart(2, '0')}:00`; if (scheduleData[day][hourStr]) scheduleData[day][hourStr] = { demand: cnt, noShowRate: cnt > 0 ? parseInt(String(b.cancelled)) / cnt : 0 }; }
    });
    const recommendations: ScheduleRecommendation[] = [];
    for (let day = 1; day <= 5; day++) { let bestHour = '10:00'; let bestScore = -1; Object.entries(scheduleData[day]).forEach(([hour, data]) => { const score = data.demand * (1 - data.noShowRate); if (score > bestScore) { bestScore = score; bestHour = hour; } }); recommendations.push({ day: days[day], bestTime: bestHour, occupancy: Math.min(100, Math.round(bestScore * 10) || 50), factors: scheduleData[day] }); }
    await mlCache.set(cacheKey, recommendations, 15 * 60 * 1000);
    return recommendations;
  } catch (err) { logger.error('[ML] Error analyzing schedules:', (err as Error).message); return []; }
};

export const analyzeVitalSigns = async (vitalSigns: Record<string, unknown> | undefined, tenantId: string): Promise<VitalSignsAnalysis> => {
  if (!vitalAnomalyModel || !vitalAnomalyModel.trained) {
    enqueueJob('ml:train', { tenantId }).catch((err) => {
      logger.error('[ML] Failed to queue training job', { error: (err as Error).message });
    });
    return { anomaly: false, score: 0, warnings: [], values: { systolic: 120, diastolic: 80, heartRate: 70, temp: 36.5 }, normalRanges: { systolic: { min: 0, max: 0 }, diastolic: { min: 0, max: 0 }, heartRate: { min: 0, max: 0 }, temperature: { min: '0', max: '0' } }, reason: 'model_training_queued' };
  }
  try {
    const vs = vitalSigns || {};
    const systolic = parseInt((vs.pressure as string)?.split('/')[0] || '120'); const diastolic = parseInt((vs.pressure as string)?.split('/')[1] || '80');
    const heartRate = parseInt(String(vs.heartRate || '70')); const temp = parseFloat(String(vs.temperature || '36.5'));
    const values = [systolic, diastolic, heartRate, temp];
    const zScores = values.map((v, i) => Math.abs((v - vitalAnomalyModel!.mean![i]) / vitalAnomalyModel!.std![i]));
    const maxScore = Math.max(...zScores); const isAnomaly = maxScore > vitalAnomalyModel!.threshold!;
    const warnings: string[] = [];
    if (zScores[0] > vitalAnomalyModel!.threshold!) warnings.push('Systolic pressure abnormal');
    if (zScores[1] > vitalAnomalyModel!.threshold!) warnings.push('Diastolic pressure abnormal');
    if (zScores[2] > vitalAnomalyModel!.threshold!) warnings.push('Heart rate abnormal');
    if (zScores[3] > vitalAnomalyModel!.threshold!) warnings.push('Temperature abnormal');
    const cvRisk = calculateCardiovascularRisk(systolic, diastolic, heartRate);
    if (["high","medium"].includes(cvRisk.level)) { warnings.push(`Cardiovascular risk: ${cvRisk.level} (score: ${cvRisk.score})`); warnings.push(...cvRisk.factors); }
    return { anomaly: isAnomaly || cvRisk.level === 'high', score: Math.round(maxScore * 100) / 100, warnings, values: { systolic, diastolic, heartRate, temp }, normalRanges: { systolic: { min: Math.round(vitalAnomalyModel!.mean![0] - 2 * vitalAnomalyModel!.std![0]), max: Math.round(vitalAnomalyModel!.mean![0] + 2 * vitalAnomalyModel!.std![0]) }, diastolic: { min: Math.round(vitalAnomalyModel!.mean![1] - 2 * vitalAnomalyModel!.std![1]), max: Math.round(vitalAnomalyModel!.mean![1] + 2 * vitalAnomalyModel!.std![1]) }, heartRate: { min: Math.round(vitalAnomalyModel!.mean![2] - 2 * vitalAnomalyModel!.std![2]), max: Math.round(vitalAnomalyModel!.mean![2] + 2 * vitalAnomalyModel!.std![2]) }, temperature: { min: (vitalAnomalyModel!.mean![3] - 2 * vitalAnomalyModel!.std![3]).toFixed(1), max: (vitalAnomalyModel!.mean![3] + 2 * vitalAnomalyModel!.std![3]).toFixed(1) } }, cardiovascularRisk: cvRisk.level, cardiovascularFactors: cvRisk.factors };
  } catch (err) { logger.error('[ML] Error analyzing vital signs:', (err as Error).message); return { anomaly: false, score: 0, warnings: [], values: { systolic: 120, diastolic: 80, heartRate: 70, temp: 36.5 }, normalRanges: { systolic: { min: 0, max: 0 }, diastolic: { min: 0, max: 0 }, heartRate: { min: 0, max: 0 }, temperature: { min: '0', max: '0' } }, error: (err as Error).message }; }
};
