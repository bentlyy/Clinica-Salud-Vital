import { pool } from '../../shared/db.js';
import { logger } from '../../utils/logger.js';
import { mlCache } from './ml.cache.js';
import { trackTrainingMetric } from './ml.middleware.js';
import { getTF, trainWithTimeout, safeDispose, noShowModel, setNoShowModel, diagnosisModel, setDiagnosisModel, demandModel, setDemandModel, vitalAnomalyModel, setVitalAnomalyModel } from './ml.shared.js';
import { getStopWords } from './ml.features.js';
import { saveModelMetrics } from './ml.monitoring.js';
import type { TrainingResult, TrainAllResults, SequentialModel } from './ml.types.js';
import { disposeAllModels } from './ml.registry.js';

export const trainNoShowModel = async (tenantId: string): Promise<TrainingResult> => {
  const startTime = Date.now();
  logger.info('[ML] Training No-Show model (enhanced)...');
  try {
    const { tensor2d, sequential, layers, train } = await getTF();
    const cacheKey = `tenant:${tenantId}:model:noshow`;
    const cached = await mlCache.get(cacheKey) as { model: SequentialModel } | null;
    if (cached) {
      setNoShowModel(cached.model); (noShowModel as any)!.trained = true;
      logger.info('[ML] No-Show model loaded from cache');
      trackTrainingMetric(true, Date.now() - startTime);
      return { trained: true, cached: true };
    }
    const bookings = await pool.query(`
      SELECT b.id, b.doctor_id, b.user_id, b.date, b.time, b.status, u.no_show_count, u.blocked_until, d.specialty,
        EXTRACT(DOW FROM b.date) as day_of_week, EXTRACT(HOUR FROM b.time) as hour, EXTRACT(MONTH FROM b.date) as month,
        (b.date - b.created_at::date) as days_advance,
        (SELECT COUNT(*)::float FROM bookings b2 WHERE b2.user_id = b.user_id AND b2.date >= NOW() - INTERVAL '30 days') as user_bookings_month
      FROM bookings b LEFT JOIN users u ON b.user_id = u.id LEFT JOIN doctors d ON b.doctor_id = d.id
      WHERE b.date >= NOW() - INTERVAL '6 months' AND b.created_at IS NOT NULL AND b.tenant_id = $1
    `, [tenantId]);
    if (bookings.rows.length < 10) {
      trackTrainingMetric(false, Date.now() - startTime);
      return { trained: false, reason: 'insufficient_data', samples: 0 };
    }
    const specialtyMap = new Map<string, number>(); let specialtyIdx = 0;
    bookings.rows.forEach((b: Record<string, unknown>) => { const s = (b.specialty as string) || 'general'; if (!specialtyMap.has(s)) specialtyMap.set(s, specialtyIdx++); });
    const specialtyCount = Math.max(specialtyMap.size, 1);
    const X: number[][] = []; const y: number[] = [];
    bookings.rows.forEach((b: Record<string, unknown>) => {
      const hour = parseInt((b.time as string)?.split(':')[0] || '9'); const dayOfWeek = parseInt(String(b.day_of_week)) || 1;
      const month = parseInt(String(b.month)) || 1; const noShowHistory = (b.no_show_count as number) || 0;
      const isBlocked = b.blocked_until && new Date(b.blocked_until as string) > new Date() ? 1 : 0;
      const daysAdvance = parseInt(String(b.days_advance)) || 7; const userBookings = parseInt(String(b.user_bookings_month)) || 0;
      const specialty = specialtyMap.get((b.specialty as string) || 'general') || 0;
      X.push([hour / 24, dayOfWeek / 7, month / 12, noShowHistory / 10, isBlocked, Math.min(daysAdvance, 30) / 30, Math.min(userBookings, 10) / 10, specialty / specialtyCount, dayOfWeek === 1 ? 1 : 0, dayOfWeek === 5 ? 1 : 0, hour < 12 ? 1 : 0, hour >= 14 && hour < 18 ? 1 : 0]);
      y.push(b.status === 'no_show' ? 1 : 0);
    });
    const mean = X[0].map((_, i) => X.reduce((s, r) => s + r[i], 0) / X.length);
    const std = X[0].map((_, i) => { const v = X.reduce((s, r) => s + Math.pow(r[i] - mean[i], 2), 0) / X.length; return Math.sqrt(v) || 1; });
    const Xnorm: number[][] = X.map(r => r.map((v, i) => (v - mean[i]) / std[i]));
    const xs = tensor2d(Xnorm as unknown as number[][]); const ys = tensor2d(y as unknown as number[][], [y.length, 1]);
    if (noShowModel) noShowModel.dispose();
    const model = sequential(); model.add(layers.dense({ units: 32, activation: 'relu', inputShape: [12] }));
    model.add(layers.dense({ units: 16, activation: 'relu' })); model.add(layers.dense({ units: 8, activation: 'relu' })); model.add(layers.dense({ units: 1, activation: 'sigmoid' }));
    model.compile({ optimizer: train.adam(0.005), loss: 'binaryCrossentropy', metrics: ['accuracy', 'auc'] });
    await trainWithTimeout(() => model.fit(xs, ys, { epochs: 50, verbose: 0 }));
    safeDispose(xs); safeDispose(ys);
    model.trained = true; model.mean = mean; model.std = std; model.specialtyList = Array.from(specialtyMap.keys());
    setNoShowModel(model);
    await mlCache.set(cacheKey, { model }, 30 * 60 * 1000);
    await saveModelMetrics('noshow', Date.now() - startTime, X.length, undefined, undefined, undefined, tenantId);
    const duration = Date.now() - startTime;
    logger.info(`[ML] No-Show model trained in ${duration}ms with ${X.length} samples, ${specialtyMap.size} specialties`);
    trackTrainingMetric(true, duration);
    return { trained: true, samples: X.length, duration };
  } catch (err) {
    logger.error('[ML] Error training No-Show model:', (err as Error).message);
    trackTrainingMetric(false, Date.now() - startTime);
    return { trained: false, error: (err as Error).message };
  }
};

export const trainDiagnosisClassifier = async (tenantId: string): Promise<TrainingResult> => {
  const startTime = Date.now();
  logger.info('[ML] Training diagnosis classifier (TF-IDF enhanced)...');
  try {
    const { tensor2d, sequential, layers } = await getTF();
    const cacheKey = `tenant:${tenantId}:model:diagnosis`;
    const cached = await mlCache.get(cacheKey) as { model: SequentialModel } | null;
    if (cached) { setDiagnosisModel(cached.model); logger.info('[ML] Diagnosis model loaded from cache'); trackTrainingMetric(true, Date.now() - startTime); return { trained: true, cached: true }; }
    const records = await pool.query(`SELECT chief_complaint, diagnosis FROM clinical_records WHERE diagnosis IS NOT NULL AND diagnosis != '' AND chief_complaint IS NOT NULL AND chief_complaint != '' AND tenant_id = $1`, [tenantId]);
    if (records.rows.length < 5) { trackTrainingMetric(false, Date.now() - startTime); return { trained: false, reason: 'insufficient_data' }; }
    const stopWords = getStopWords();
    const docTokens: string[][] = []; const allTokens = new Set<string>();
    records.rows.forEach((r: Record<string, unknown>) => {
      const tokens = (r.chief_complaint as string || '').toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 2 && !stopWords.has(t));
      docTokens.push(tokens); tokens.forEach(t => allTokens.add(t));
    });
    const vocabArray: string[] = Array.from(allTokens); const diagnoses: string[] = Array.from(new Set(records.rows.map(r => r.diagnosis as string)));
    if (diagnoses.length < 2 || vocabArray.length < 3) return { trained: false, reason: 'insufficient_variety' };
    const docFreq = new Map<string, number>(); vocabArray.forEach(term => docFreq.set(term, docTokens.filter(tokens => tokens.includes(term)).length));
    const idf = new Map<string, number>(); const nDocs = docTokens.length; vocabArray.forEach(term => idf.set(term, Math.log(nDocs / (docFreq.get(term) || 1)) + 1));
    const X: number[][] = docTokens.map(tokens => { const tf = new Map<string, number>(); tokens.forEach(t => tf.set(t, (tf.get(t) || 0) + 1)); return vocabArray.map(v => (tf.get(v) || 0) * (idf.get(v) || 1)); });
    const maxVals = X[0].map((_, i) => Math.max(...X.map(r => Math.abs(r[i]))));
    const Xnorm: number[][] = X.map(r => r.map((v, i) => v / (maxVals[i] || 1)));
    const y = records.rows.map(r => diagnoses.indexOf(r.diagnosis as string));
    const xs = tensor2d(Xnorm as unknown as number[][]); const ys = tensor2d(y as unknown as number[][], [y.length, 1]);
    if (diagnosisModel) diagnosisModel.dispose();
    const model = sequential(); model.add(layers.dense({ units: 64, activation: 'relu', inputShape: [vocabArray.length] }));
    model.add(layers.dense({ units: 32, activation: 'relu' })); model.add(layers.dense({ units: 16, activation: 'relu' }));
    model.add(layers.dense({ units: diagnoses.length, activation: 'softmax' }));
    model.compile({ optimizer: 'adam', loss: 'sparseCategoricalCrossentropy', metrics: ['accuracy', 'precision'] });
    await trainWithTimeout(() => model.fit(xs, ys, { epochs: 75, verbose: 0 }));
    safeDispose(xs); safeDispose(ys);
    model.vocab = vocabArray; model.diagnoses = diagnoses; model.idf = vocabArray.map(v => idf.get(v) || 1); model.maxVals = maxVals; model.trained = true;
    setDiagnosisModel(model);
    await mlCache.set(cacheKey, { model }, 30 * 60 * 1000);
    await saveModelMetrics('diagnosis', Date.now() - startTime, records.rows.length, undefined, undefined, undefined, tenantId);
    const duration = Date.now() - startTime;
    logger.info(`[ML] Diagnosis classifier trained in ${duration}ms, vocab: ${vocabArray.length}, diagnoses: ${diagnoses.length}`);
    trackTrainingMetric(true, duration);
    return { trained: true, diagnoses: diagnoses.length, samples: records.rows.length };
  } catch (err) {
    logger.error('[ML] Error training diagnosis classifier:', (err as Error).message);
    trackTrainingMetric(false, Date.now() - startTime);
    return { trained: false, error: (err as Error).message };
  }
};

export const trainDemandForecastModel = async (tenantId: string): Promise<TrainingResult> => {
  const startTime = Date.now();
  logger.info('[ML] Training demand forecast model (enhanced with fallback)...');
  try {
    const { tensor3d, tensor2d, sequential, layers: dlayers } = await getTF();
    const cacheKey = `tenant:${tenantId}:model:demand`;
    const cached = await mlCache.get(cacheKey) as { model: SequentialModel } | null;
    if (cached) { setDemandModel(cached.model); logger.info('[ML] Demand model loaded from cache'); trackTrainingMetric(true, Date.now() - startTime); return { trained: true, cached: true }; }
    const bookings = await pool.query(`SELECT date, COUNT(*)::int as count FROM bookings WHERE date >= NOW() - INTERVAL '6 months' AND status != 'cancelled' AND tenant_id = $1 GROUP BY date ORDER BY date`, [tenantId]);
    if (bookings.rows.length < 14) { trackTrainingMetric(false, Date.now() - startTime); return { trained: false, reason: 'insufficient_data' }; }
    const values = bookings.rows.map(b => parseInt(String(b.count)));
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance); const windowSize = 7;
    const sequences: number[][] = []; const targets: number[] = [];
    for (let i = windowSize; i < values.length; i++) {
      sequences.push(values.slice(i - windowSize, i).map(v => (v - avg) / (stdDev || 1)));
      targets.push((values[i] - avg) / (stdDev || 1));
    }
    if (sequences.length < 5) return { trained: false, reason: 'insufficient_sequences' };
    let modelTrained = false;
    try {
      const xs = tensor3d(sequences as unknown as number[][][]); const ys = tensor2d(targets as unknown as number[][], [targets.length, 1]);
      if (demandModel) demandModel.dispose();
      const model = sequential(); model.add(dlayers.lstm({ units: 32, returnSequences: false, inputShape: [windowSize, 1] }));
      model.add(dlayers.lstm({ units: 16, returnSequences: false })); model.add(dlayers.dense({ units: 8, activation: 'relu' })); model.add(dlayers.dense({ units: 1 }));
      model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
      await trainWithTimeout(() => model.fit(xs, ys, { epochs: 50, verbose: 0 }), 45000);
      safeDispose(xs); safeDispose(ys); modelTrained = true;
      setDemandModel(model);
    } catch (tfErr) { logger.warn('[ML] LSTM training failed, will use statistical fallback:', (tfErr as Error).message); }
    if (!demandModel) setDemandModel(sequential());
    demandModel!.originalData = values; demandModel!.windowSize = windowSize; demandModel!.mean = [avg]; demandModel!.std = [stdDev];
    demandModel!.trained = true; demandModel!.lstmTrained = modelTrained;
    await mlCache.set(cacheKey, { model: demandModel }, 30 * 60 * 1000);
    await saveModelMetrics('demand', Date.now() - startTime, values.length, undefined, undefined, undefined, tenantId);
    const duration = Date.now() - startTime;
    logger.info(`[ML] Demand model trained in ${duration}ms, data points: ${values.length}, type: ${modelTrained ? 'LSTM' : 'Statistical'}`);
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
  logger.info('[ML] Training vital signs anomaly detector (enhanced)...');
  try {
    const cacheKey = `tenant:${tenantId}:model:vitals`;
    const cached = await mlCache.get(cacheKey) as { model: { mean: number[]; std: number[]; threshold: number; trained: boolean } } | null;
    if (cached) { setVitalAnomalyModel(cached.model); logger.info('[ML] Vital signs model loaded from cache'); trackTrainingMetric(true, Date.now() - startTime); return { trained: true, cached: true }; }
    const records = await pool.query(`SELECT vital_signs FROM clinical_records WHERE vital_signs IS NOT NULL AND vital_signs != '{}' AND tenant_id = $1`, [tenantId]);
    if (records.rows.length < 20) { trackTrainingMetric(false, Date.now() - startTime); return { trained: false, reason: 'insufficient_data' }; }
    const features: number[][] = records.rows.filter(r => r.vital_signs).map(r => {
      const vs = r.vital_signs as Record<string, unknown> | undefined; if (!vs) return [120, 80, 70, 36.5];
      return [parseInt((vs.pressure as string)?.split('/')[0] || '120'), parseInt((vs.pressure as string)?.split('/')[1] || '80'), parseInt(String(vs.heartRate || '70')), parseFloat(String(vs.temperature || '36.5'))];
    }).filter((f): f is number[] => f[0] > 0);
    if (features.length < 20) return { trained: false, reason: 'insufficient_valid_data' };
    const mean = features.reduce((acc, f) => acc.map((v, i) => v + f[i]), [0, 0, 0, 0]).map(v => v / features.length);
    const std = features[0].map((_, i) => { const v = features.reduce((sum, f) => sum + Math.pow(f[i] - mean[i], 2), 0) / features.length; return Math.sqrt(v) || 1; });
    const model = { mean, std, threshold: 2.0, trained: true };
    setVitalAnomalyModel(model);
    await mlCache.set(cacheKey, { model }, 30 * 60 * 1000);
    await saveModelMetrics('vitals', Date.now() - startTime, features.length, undefined, undefined, undefined, tenantId);
    const duration = Date.now() - startTime;
    logger.info(`[ML] Vital signs detector trained in ${duration}ms, samples: ${features.length}`);
    trackTrainingMetric(true, duration);
    return { trained: true, samples: features.length };
  } catch (err) {
    logger.error('[ML] Error training vital signs detector:', (err as Error).message);
    trackTrainingMetric(false, Date.now() - startTime);
    return { trained: false, error: (err as Error).message };
  }
};

export const trainAllModels = async (tenantId: string): Promise<TrainAllResults> => {
  if ((await import('./ml.shared.js')).isMLSimplified()) {
    logger.info('[ML] Simplified mode - skipping TF model training');
    const skipped: TrainingResult = { trained: false, reason: 'simplified_mode' };
    return { noShow: skipped, diagnosis: skipped, demand: skipped, vitals: skipped, totalDuration: 0 };
  }
  disposeAllModels();
  const results: TrainAllResults = { noShow: { trained: false }, diagnosis: { trained: false }, demand: { trained: false }, vitals: { trained: false }, totalDuration: 0 };
  const startTime = Date.now();
  try {
    const [noShow, diagnosis, demand, vitals] = await Promise.all([
      trainNoShowModel(tenantId), trainDiagnosisClassifier(tenantId), trainDemandForecastModel(tenantId), trainVitalSignsAnomalyDetector(tenantId)
    ]);
    results.noShow = noShow; results.diagnosis = diagnosis; results.demand = demand; results.vitals = vitals;
    results.totalDuration = Date.now() - startTime;
    logger.info('[ML] All models trained:', results);
    return results;
  } catch (err) {
    logger.error('[ML] Error training all models:', (err as Error).message);
    return { ...results, error: (err as Error).message, partial: results } as unknown as TrainAllResults;
  }
};
