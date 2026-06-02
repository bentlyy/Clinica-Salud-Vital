import { pool } from '../../shared/db.js';
import { logger } from '../../utils/logger.js';
import { mlCache } from './ml.cache.js';
import { trackTrainingMetric } from './ml.middleware.js';

interface TensorFlowModule {
  tensor2d: (data: number[][], shape?: [number, number]) => unknown;
  tensor3d: (data: number[][][], shape?: [number, number, number]) => unknown;
  sequential: () => SequentialModel;
  layers: {
    dense: (config: { units: number; activation?: string; inputShape?: number[] }) => Layer;
    lstm: (config: { units: number; returnSequences: boolean; inputShape?: [number, number] }) => Layer;
  };
  train: {
    adam: (learningRate: number) => Optimizer;
  };
}

interface SequentialModel {
  add: (layer: Layer) => void;
  compile: (config: { optimizer: string | Optimizer; loss: string; metrics?: string[] }) => void;
  fit: (xs: unknown, ys: unknown, config: { epochs: number; verbose: number }) => Promise<History>;
  predict: (input: unknown) => Tensor;
  dispose: () => void;
  trained?: boolean;
  vocab?: string[];
  diagnoses?: string[];
  idf?: number[];
  maxVals?: number[];
  originalData?: number[];
  windowSize?: number;
  mean?: number[];
  std?: number[];
  threshold?: number;
  specialtyList?: string[];
}

interface Layer {
  units: number;
}

interface Optimizer {}

interface Tensor {
  data: () => Promise<Float32Array>;
  dispose: () => void;
}

interface History {}

interface TrainingResult {
  trained: boolean;
  cached?: boolean;
  reason?: string;
  samples?: number;
  duration?: number;
  diagnoses?: number;
  dataPoints?: number;
  error?: string;
}

interface PredictionResult {
  risk?: number;
  confidence: string;
  recommendation?: string;
  reason?: string;
  error?: string;
}

interface DiagnosisPrediction {
  predictions: Array<{ diagnosis: string; confidence: number }>;
  reason?: string;
  error?: string;
}

export interface ForecastResult {
  date: string;
  predicted: number;
  confidence: string;
  reason?: string;
}

interface ScheduleRecommendation {
  day: string;
  bestTime: string;
  occupancy: number;
  factors: Record<string, { demand: number; noShowRate: number }>;
}

interface VitalSignsAnalysis {
  anomaly: boolean;
  score: number;
  warnings: string[];
  values: { systolic: number; diastolic: number; heartRate: number; temp: number };
  normalRanges: {
    systolic: { min: number; max: number };
    diastolic: { min: number; max: number };
    heartRate: { min: number; max: number };
    temperature: { min: string; max: string };
  };
  reason?: string;
  error?: string;
  cardiovascularRisk?: string;
  cardiovascularFactors?: string[];
}

interface ModelStatus {
  noShowModel: string;
  diagnosisModel: string;
  demandModel: string;
  vitalAnomalyModel: string;
  cacheStats: ReturnType<typeof mlCache.getStats>;
}

interface TrainAllResults {
  noShow: TrainingResult;
  diagnosis: TrainingResult;
  demand: TrainingResult;
  vitals: TrainingResult;
  totalDuration: number;
  error?: string;
  partial?: Record<string, TrainingResult>;
}

let tf: TensorFlowModule | null = null;
let tfLoaded = false;
let noShowModel: SequentialModel | null = null;
let diagnosisModel: SequentialModel | null = null;
let demandModel: SequentialModel | null = null;
let vitalAnomalyModel: { mean: number[]; std: number[]; threshold: number; trained: boolean } | null = null;

const trainingLocks: Record<string, Promise<unknown> | null> = {};

const withTrainingLock = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
  if (trainingLocks[key]) {
    return trainingLocks[key] as Promise<T>;
  }
  trainingLocks[key] = fn().finally(() => { trainingLocks[key] = null; });
  return trainingLocks[key] as Promise<T>;
};

const getTF = async (): Promise<TensorFlowModule> => {
  if (!tfLoaded) {
    logger.info('[ML] Loading TensorFlow (lazy load)...');
    const tfModule = await import('@tensorflow/tfjs');
    tf = tfModule as unknown as TensorFlowModule;
    tfLoaded = true;
    logger.info('[ML] TensorFlow loaded');
  }
  return tf!;
};

const normalizeData = (data: number[]): number[] => {
  if (!data || data.length === 0) return [];
  const min = Math.min(...data);
  const max = Math.max(...data);
  if (max === min) return data.map(() => 0.5);
  return data.map(v => (v - min) / (max - min));
};

const denormalize = (normalized: number[], originalData: number[]): number[] => {
  if (!originalData || originalData.length === 0) return normalized;
  const min = Math.min(...originalData);
  const max = Math.max(...originalData);
  if (max === min) return normalized;
  return normalized.map(v => Math.round(v * (max - min) + min));
};

export const getStopWords = (): Set<string> => new Set([
  'el', 'la', 'los', 'las', 'de', 'del', 'en', 'un', 'una', 'por', 'para',
  'con', 'sin', 'mi', 'tu', 'su', 'yo', 'que', 'es', 'son', 'me', 'tiene',
  'mucho', 'poco', 'hace', 'tengo', 'tener', 'ya', 'mas', 'menos', 'muy'
]);

export const tokenizeText = (text: string): string[] => {
  const stopWords = getStopWords();
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !stopWords.has(t));
};

export const vectorizeDiagnosis = (text: string, vocab: string[], idf: number[], maxVals: number[]): number[] => {
  const tokens = tokenizeText(text);
  const tf = new Map<string, number>();
  tokens.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
  const raw = vocab.map((v, i) => {
    const tfVal = tf.get(v) || 0;
    return tfVal * (idf[i] || 1);
  });
  return raw.map((v, i) => v / (maxVals[i] || 1));
};

const safeDispose = (tensor: unknown): void => {
  if (tensor && typeof tensor === 'object' && 'dispose' in tensor && typeof (tensor as { dispose: () => void }).dispose === 'function') {
    try {
      (tensor as { dispose: () => void }).dispose();
    } catch (e) {
      logger.warn('[ML] Error disposing tensor:', (e as Error).message);
    }
  }
};

const trainWithTimeout = async <T>(trainingFn: () => Promise<T>, timeout = 60000): Promise<T> => {
  return Promise.race([
    trainingFn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Training timeout')), timeout)
    )
  ]);
};

export const trainNoShowModel = async (tenantId?: string): Promise<TrainingResult> => {
  const startTime = Date.now();
  logger.info('[ML] Training No-Show model (enhanced)...');

  try {
    const { tensor2d, sequential, layers, train } = await getTF();
    const cacheKey = tenantId ? `tenant:${tenantId}:model:noshow` : 'model:noshow';
    const cached = await mlCache.get(cacheKey) as { model: SequentialModel } | null;
    if (cached) {
      noShowModel = cached.model;
      noShowModel.trained = true;
      noShowModel.mean = noShowModel.mean || [];
      noShowModel.std = noShowModel.std || [];
      logger.info('[ML] No-Show model loaded from cache');
      trackTrainingMetric(true, Date.now() - startTime);
      return { trained: true, cached: true };
    }

    const bookings = await pool.query(`
      SELECT b.id, b.doctor_id, b.user_id, b.date, b.time, b.status,
        u.no_show_count, u.blocked_until,
        d.specialty,
        EXTRACT(DOW FROM b.date) as day_of_week,
        EXTRACT(HOUR FROM b.time) as hour,
        EXTRACT(MONTH FROM b.date) as month,
        (b.date - b.created_at::date) as days_advance,
        (
          SELECT COUNT(*)::float
          FROM bookings b2
          WHERE b2.user_id = b.user_id
            AND b2.date >= NOW() - INTERVAL '30 days'
        ) as user_bookings_month
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN doctors d ON b.doctor_id = d.id
      WHERE b.date >= NOW() - INTERVAL '6 months'
        AND b.created_at IS NOT NULL
        ${tenantId ? 'AND b.tenant_id = $1' : ''}
    `, tenantId ? [tenantId] : []);

    if (bookings.rows.length < 10) {
      logger.warn('[ML] Insufficient data for No-Show training');
      trackTrainingMetric(false, Date.now() - startTime);
      return { trained: false, reason: 'insufficient_data', samples: 0 };
    }

    const specialtyMap = new Map<string, number>();
    let specialtyIdx = 0;
    bookings.rows.forEach((b: Record<string, unknown>) => {
      const spec = (b.specialty as string) || 'general';
      if (!specialtyMap.has(spec)) {
        specialtyMap.set(spec, specialtyIdx++);
      }
    });
    const specialtyCount = Math.max(specialtyMap.size, 1);

    const X: number[][] = [];
    const y: number[] = [];

    bookings.rows.forEach((b: Record<string, unknown>) => {
      const isNoShow = b.status === 'no_show';
      const hour = parseInt((b.time as string)?.split(':')[0] || '9');
      const dayOfWeek = parseInt(String(b.day_of_week)) || 1;
      const month = parseInt(String(b.month)) || 1;
      const noShowHistory = (b.no_show_count as number) || 0;
      const isBlocked = b.blocked_until && new Date(b.blocked_until as string) > new Date() ? 1 : 0;
      const daysAdvance = parseInt(String(b.days_advance)) || 7;
      const userBookings = parseInt(String(b.user_bookings_month)) || 0;
      const specialty = specialtyMap.get((b.specialty as string) || 'general') || 0;
      const isMonday = dayOfWeek === 1 ? 1 : 0;
      const isFriday = dayOfWeek === 5 ? 1 : 0;
      const isMorning = hour < 12 ? 1 : 0;
      const isAfternoon = hour >= 14 && hour < 18 ? 1 : 0;

      X.push([
        hour / 24,
        dayOfWeek / 7,
        month / 12,
        noShowHistory / 10,
        isBlocked,
        Math.min(daysAdvance, 30) / 30,
        Math.min(userBookings, 10) / 10,
        specialty / specialtyCount,
        isMonday,
        isFriday,
        isMorning,
        isAfternoon
      ]);
      y.push(isNoShow ? 1 : 0);
    });

    const mean = X[0].map((_, i) => X.reduce((sum, row) => sum + row[i], 0) / X.length);
    const std = X[0].map((_, i) => {
      const variance = X.reduce((sum, row) => sum + Math.pow(row[i] - mean[i], 2), 0) / X.length;
      return Math.sqrt(variance) || 1;
    });

    const Xnorm: number[][] = X.map(row => row.map((v, i) => (v - mean[i]) / std[i]));

    const xs = tensor2d(Xnorm as unknown as number[][]);
    const ys = tensor2d(y as unknown as number[][], [y.length, 1]);

    if (noShowModel) {
      noShowModel.dispose();
    }

    noShowModel = sequential();
    noShowModel.add(layers.dense({ units: 32, activation: 'relu', inputShape: [12] }));
    noShowModel.add(layers.dense({ units: 16, activation: 'relu' }));
    noShowModel.add(layers.dense({ units: 8, activation: 'relu' }));
    noShowModel.add(layers.dense({ units: 1, activation: 'sigmoid' }));

    noShowModel.compile({
      optimizer: train.adam(0.005),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'auc']
    });

    await trainWithTimeout(() => noShowModel!.fit(xs, ys, { epochs: 50, verbose: 0 }));

    safeDispose(xs);
    safeDispose(ys);
    noShowModel.trained = true;
    noShowModel.mean = mean;
    noShowModel.std = std;
    noShowModel.specialtyList = Array.from(specialtyMap.keys());

    await mlCache.set(cacheKey, { model: noShowModel }, 30 * 60 * 1000);

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

export const predictNoShow = async (doctorId: number | undefined, userId: number | undefined, date: string, time: string, bookingId?: number, tenantId?: string): Promise<PredictionResult> => {
  if (!doctorId || !userId) {
    return { risk: 0.3, confidence: 'low', reason: 'invalid_input' };
  }

  const cacheKey = tenantId ? `tenant:${tenantId}:predict:noshow:${doctorId}:${userId}:${date}:${time}` : `predict:noshow:${doctorId}:${userId}:${date}:${time}`;
  const cached = await mlCache.get(cacheKey) as PredictionResult | null;
  if (cached) {
    return cached;
  }

  if (!noShowModel || !noShowModel.trained) {
    const result = await withTrainingLock('noshow', () => trainNoShowModel(tenantId));
    if (!result.trained) {
      return { risk: 0.3, confidence: 'low', reason: 'model_not_trained' };
    }
  }

  try {
    const { tensor2d: tensor2d2 } = await getTF();
    const userResult = await pool.query(
      `SELECT u.no_show_count, u.blocked_until, d.specialty,
        (
          SELECT COUNT(*)::float
          FROM bookings b2
          WHERE b2.user_id = u.id
            AND b2.date >= NOW() - INTERVAL '30 days'
        ) as user_bookings_month
      FROM users u
      LEFT JOIN doctors d ON d.user_id = u.id
      WHERE u.id = $1`,
      [userId]
    );
    const user = userResult.rows[0] as Record<string, unknown> || {};

    let doctorSpecialtyIdx = 0;
    const doctorResult = await pool.query(
      'SELECT specialty FROM doctors WHERE id = $1',
      [doctorId]
    );
    if (doctorResult.rows.length > 0) {
      const specialtyName = doctorResult.rows[0].specialty;
      const specialtyList = noShowModel?.specialtyList || [];
      const idx = specialtyList.indexOf(specialtyName);
      if (idx >= 0) doctorSpecialtyIdx = idx;
    }

    const bookingResult = await pool.query(
      'SELECT created_at::date as created_date FROM bookings WHERE doctor_id = $1 AND user_id = $2 AND date = $3::date LIMIT 1',
      [doctorId, userId, date]
    );
    const bookingCreated = bookingResult.rows[0]?.created_date ? new Date(bookingResult.rows[0].created_date) : new Date();
    const daysAdvance = Math.max(1, Math.ceil((new Date(date).getTime() - bookingCreated.getTime()) / (1000 * 60 * 60 * 24)));

    const hour = parseInt(time?.split(':')[0]) || 9;
    const dayOfWeek = new Date(date).getDay();
    const month = new Date(date).getMonth() + 1;
    const noShowHistory = (user?.no_show_count as number) || 0;
    const isBlocked = user?.blocked_until && new Date(user.blocked_until as string) > new Date() ? 1 : 0;
    const userBookings = parseInt(String(user?.user_bookings_month)) || 0;
    const specialty = doctorSpecialtyIdx;
    const isMonday = dayOfWeek === 1 ? 1 : 0;
    const isFriday = dayOfWeek === 5 ? 1 : 0;
    const isMorning = hour < 12 ? 1 : 0;
    const isAfternoon = hour >= 14 && hour < 18 ? 1 : 0;

    const rawFeatures = [
      hour / 24,
      dayOfWeek / 7,
      month / 12,
      noShowHistory / 10,
      isBlocked,
      Math.min(daysAdvance, 30) / 30,
      Math.min(userBookings, 10) / 10,
      specialty / Math.max(1, 1),
      isMonday,
      isFriday,
      isMorning,
      isAfternoon
    ];

    const mean = noShowModel?.mean || Array(12).fill(0);
    const std = noShowModel?.std || Array(12).fill(1);
    const features = rawFeatures.map((v, i) => (v - mean[i]) / std[i]);

    const input = tensor2d2([features]);
    const prediction = noShowModel!.predict(input);
    const risk = (await (prediction as Tensor).data())[0];

    safeDispose(input);
    safeDispose(prediction);

    const riskScore = Math.max(0.05, Math.min(0.95, risk));
    const result: PredictionResult = {
      risk: Math.round(riskScore * 100) / 100,
      confidence: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low',
      recommendation: riskScore > 0.7 ? 'Consider blocking booking or send extra reminders' : riskScore > 0.4 ? 'Send reminder' : 'Normal follow-up'
    };

    await mlCache.set(cacheKey, result, 5 * 60 * 1000);
    
    await savePrediction('noshow', { doctorId, userId, date, time, features: rawFeatures }, result as unknown as Record<string, unknown>, { doctorId, userId, bookingId }, tenantId);
    
    return result;
  } catch (err) {
    logger.error('[ML] Error predicting no-show:', (err as Error).message);
    return { risk: 0.5, confidence: 'low', error: (err as Error).message };
  }
};

export const trainDiagnosisClassifier = async (tenantId?: string): Promise<TrainingResult> => {
  const startTime = Date.now();
  logger.info('[ML] Training diagnosis classifier (TF-IDF enhanced)...');

  try {
    const { tensor2d, sequential, layers } = await getTF();
    const cacheKey = tenantId ? `tenant:${tenantId}:model:diagnosis` : 'model:diagnosis';
    const cached = await mlCache.get(cacheKey) as { model: SequentialModel } | null;
    if (cached) {
      diagnosisModel = cached.model;
      logger.info('[ML] Diagnosis model loaded from cache');
      trackTrainingMetric(true, Date.now() - startTime);
      return { trained: true, cached: true };
    }

    const records = await pool.query(`
      SELECT chief_complaint, diagnosis
      FROM clinical_records
      WHERE diagnosis IS NOT NULL AND diagnosis != ''
        AND chief_complaint IS NOT NULL AND chief_complaint != ''
        ${tenantId ? 'AND tenant_id = $1' : ''}
    `, tenantId ? [tenantId] : []);

    if (records.rows.length < 5) {
      logger.warn('[ML] Insufficient data for diagnosis classifier');
      trackTrainingMetric(false, Date.now() - startTime);
      return { trained: false, reason: 'insufficient_data' };
    }

    const stopWords = getStopWords();

    const docTokens: string[][] = [];
    const allTokens = new Set<string>();
    
    records.rows.forEach((r: Record<string, unknown>) => {
      const tokens = (r.chief_complaint as string || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 2 && !stopWords.has(t));
      docTokens.push(tokens);
      tokens.forEach(t => allTokens.add(t));
    });

    const vocabArray: string[] = Array.from(allTokens);
    const diagnoses: string[] = Array.from(new Set(records.rows.map(r => r.diagnosis as string)));

    if (diagnoses.length < 2 || vocabArray.length < 3) {
      return { trained: false, reason: 'insufficient_variety' };
    }

    const docFreq = new Map<string, number>();
    vocabArray.forEach(term => {
      const docsWithTerm = docTokens.filter(tokens => tokens.includes(term)).length;
      docFreq.set(term, docsWithTerm);
    });

    const idf = new Map<string, number>();
    const nDocs = docTokens.length;
    vocabArray.forEach(term => {
      const df = docFreq.get(term) || 1;
      idf.set(term, Math.log(nDocs / df) + 1);
    });

    const X: number[][] = docTokens.map(tokens => {
      const tf = new Map<string, number>();
      tokens.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
      return vocabArray.map(v => {
        const tfVal = (tf.get(v) || 0);
        const idfVal = idf.get(v) || 1;
        return tfVal * idfVal;
      });
    });

const maxVals = X[0].map((_, i) => Math.max(...X.map(row => Math.abs(row[i]))));
    const Xnorm: number[][] = X.map(row => row.map((v, i) => v / (maxVals[i] || 1)));

    const y = records.rows.map(r => diagnoses.indexOf(r.diagnosis as string));

    const xs = tensor2d(Xnorm as unknown as number[][]);
    const ys = tensor2d(y as unknown as number[][], [y.length, 1]);

    if (diagnosisModel) {
      diagnosisModel.dispose();
    }

    diagnosisModel = sequential();
    diagnosisModel.add(layers.dense({ units: 64, activation: 'relu', inputShape: [vocabArray.length] }));
    diagnosisModel.add(layers.dense({ units: 32, activation: 'relu' }));
    diagnosisModel.add(layers.dense({ units: 16, activation: 'relu' }));
    diagnosisModel.add(layers.dense({ units: diagnoses.length, activation: 'softmax' }));

    diagnosisModel.compile({
      optimizer: 'adam',
      loss: 'sparseCategoricalCrossentropy',
      metrics: ['accuracy', 'precision']
    });

    await trainWithTimeout(() => diagnosisModel!.fit(xs, ys, { epochs: 75, verbose: 0 }));

    safeDispose(xs);
    safeDispose(ys);

    diagnosisModel.vocab = vocabArray;
    diagnosisModel.diagnoses = diagnoses;
    diagnosisModel.idf = vocabArray.map(v => idf.get(v) || 1);
    diagnosisModel.maxVals = maxVals;
    diagnosisModel.trained = true;

    await mlCache.set(cacheKey, { model: diagnosisModel }, 30 * 60 * 1000);
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

export const predictDiagnosis = async (chiefComplaint: string, tenantId?: string): Promise<DiagnosisPrediction> => {
  if (!chiefComplaint || chiefComplaint.length < 2) {
    return { predictions: [], error: 'Invalid input' };
  }

  const cacheKey = tenantId ? `tenant:${tenantId}:predict:diagnosis:${chiefComplaint.substring(0, 50)}` : `predict:diagnosis:${chiefComplaint.substring(0, 50)}`;
  const cached = await mlCache.get(cacheKey) as DiagnosisPrediction | null;
  if (cached) {
    return cached;
  }

  if (!diagnosisModel || !diagnosisModel.trained) {
    const result = await withTrainingLock('diagnosis', () => trainDiagnosisClassifier(tenantId));
    if (!result.trained) {
      return { predictions: [], reason: 'model_not_trained' };
    }
  }

  try {
    const { tensor2d: tensor2d2 } = await getTF();
    const vocab = diagnosisModel!.vocab!;
    const idfWeights = diagnosisModel!.idf || vocab.map(() => 1);
    const maxVals = diagnosisModel!.maxVals || vocab.map(() => 1);
    const vector = vectorizeDiagnosis(chiefComplaint || '', vocab, idfWeights, maxVals);

    const input = tensor2d2([vector]);
    const prediction = diagnosisModel!.predict(input);
    const probabilities = await (prediction as Tensor).data();

    const top3 = Array.from(probabilities)
      .map((prob, idx) => ({ diagnosis: diagnosisModel!.diagnoses![idx], probability: prob }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3);

    safeDispose(input);
    safeDispose(prediction);

    const result: DiagnosisPrediction = {
      predictions: top3.map(t => ({
        diagnosis: t.diagnosis,
        confidence: Math.round(t.probability * 100)
      }))
    };

    await mlCache.set(cacheKey, result, 10 * 60 * 1000);
    return result;
  } catch (err) {
    logger.error('[ML] Error predicting diagnosis:', (err as Error).message);
    return { predictions: [], error: (err as Error).message };
  }
};

export const trainDemandForecastModel = async (tenantId?: string): Promise<TrainingResult> => {
  const startTime = Date.now();
  logger.info('[ML] Training demand forecast model (enhanced with fallback)...');

  try {
    const { tensor3d, tensor2d, sequential, layers: dlayers } = await getTF();
    const cacheKey = tenantId ? `tenant:${tenantId}:model:demand` : 'model:demand';
    const cached = await mlCache.get(cacheKey) as { model: SequentialModel } | null;
    if (cached) {
      demandModel = cached.model;
      logger.info('[ML] Demand model loaded from cache');
      trackTrainingMetric(true, Date.now() - startTime);
      return { trained: true, cached: true };
    }

    const bookings = await pool.query(`
      SELECT date, COUNT(*)::int as count
      FROM bookings
      WHERE date >= NOW() - INTERVAL '6 months'
        AND status != 'cancelled'
        ${tenantId ? 'AND tenant_id = $1' : ''}
      GROUP BY date
      ORDER BY date
    `, tenantId ? [tenantId] : []);

    if (bookings.rows.length < 14) {
      logger.warn('[ML] Insufficient data for demand forecast');
      trackTrainingMetric(false, Date.now() - startTime);
      return { trained: false, reason: 'insufficient_data' };
    }

    const values = bookings.rows.map(b => parseInt(String(b.count)));
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const windowSize = 7;
    const sequences: number[][] = [];
    const targets: number[] = [];

    for (let i = windowSize; i < values.length; i++) {
      sequences.push(values.slice(i - windowSize, i).map(v => (v - avg) / (stdDev || 1)));
      targets.push((values[i] - avg) / (stdDev || 1));
    }

    if (sequences.length < 5) {
      return { trained: false, reason: 'insufficient_sequences' };
    }

    let modelTrained = false;

    try {
      const xs = tensor3d(sequences as unknown as number[][][]);
      const ys = tensor2d(targets as unknown as number[][], [targets.length, 1]);

      if (demandModel) {
        demandModel.dispose();
      }

      demandModel = sequential();
      demandModel.add(dlayers.lstm({ units: 32, returnSequences: false, inputShape: [windowSize, 1] }));
      demandModel.add(dlayers.lstm({ units: 16, returnSequences: false }));
      demandModel.add(dlayers.dense({ units: 8, activation: 'relu' }));
      demandModel.add(dlayers.dense({ units: 1 }));

      demandModel.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

      await trainWithTimeout(() => demandModel!.fit(xs, ys, { epochs: 50, verbose: 0 }), 45000);

      safeDispose(xs);
      safeDispose(ys);
      modelTrained = true;
    } catch (tfErr) {
      logger.warn('[ML] LSTM training failed, will use statistical fallback:', (tfErr as Error).message);
    }

    demandModel = demandModel || sequential();
    demandModel.originalData = values;
    demandModel.windowSize = windowSize;
    demandModel.mean = [avg];
    demandModel.std = [stdDev];
    demandModel.trained = true;
    demandModel.lstmTrained = modelTrained;

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

const predictWithStatistical = (
  history: number[],
  days: number,
  windowSize: number
): { value: number; method: string }[] => {
  const results: { value: number; method: string }[] = [];
  const avg = history.reduce((a, b) => a + b, 0) / history.length;
  const seasonality = [0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15];

  for (let i = 0; i < days; i++) {
    const histLen = history.length;
    const ma7 = histLen >= 7 
      ? history.slice(-7).reduce((a, b) => a + b, 0) / 7 
      : avg;
    const ma14 = histLen >= 14 
      ? history.slice(-14).reduce((a, b) => a + b, 0) / 14 
      : ma7;
    const trend = (ma7 - ma14) / 14;
    const dayOfWeek = (new Date().getDay() + i) % 7;
    const seasonal = seasonality[dayOfWeek] || 1.0;
    
    const predicted = Math.round((ma7 + trend * 7) * seasonal);
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

export const forecastDemand = async (days = 7, tenantId?: string): Promise<ForecastResult[]> => {
  if (!demandModel || !demandModel.trained) {
    const result = await withTrainingLock('demand', () => trainDemandForecastModel(tenantId));
    if (!result.trained) {
      const lastDate = new Date();
      const avg = result.samples && result.samples > 0 ? Math.round(result.samples / 30) : 10;
      return Array.from({ length: days }, (_, i) => {
        const date = new Date(lastDate);
        date.setDate(date.getDate() + i + 1);
        return {
          date: date.toISOString().split('T')[0],
          predicted: Math.max(1, Math.round(avg + (i % 7) * 0.1 * avg)),
          confidence: 'low',
          reason: 'model_not_trained'
        };
      });
    }
  }

  try {
    const windowSize = demandModel!.windowSize!;
    const values = demandModel!.originalData!;
    const isLSTM = demandModel!.trained;

    if (!isLSTM) {
      const stats = predictWithStatistical([...values], days, windowSize);
      const forecasts = stats.map((s, i) => {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + i + 1);
        return {
          date: nextDate.toISOString().split('T')[0],
          predicted: s.value,
          confidence: 'medium',
          reason: s.method
        };
      });
      
      await saveDemandForecast(forecasts, tenantId);
      return forecasts;
    }

    const { tensor3d } = await getTF();
    const avg = demandModel!.mean![0];
    const std = demandModel!.std![0];
    const normalized = values.map(v => (v - avg) / (std || 1));
    let currentWindow = normalized.slice(-windowSize);
    const forecasts: ForecastResult[] = [];

    for (let i = 0; i < days; i++) {
      const input = tensor3d([currentWindow.map(v => [v])]);
      const pred = demandModel!.predict(input);
      const value = (await (pred as Tensor).data())[0];

      safeDispose(input);
      safeDispose(pred);

      currentWindow = [...currentWindow.slice(1), value];

      const denormalized = value * (std || 1) + avg;
      const predictedValue = Math.max(1, Math.round(denormalized));

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + i + 1);

      forecasts.push({
        date: nextDate.toISOString().split('T')[0],
        predicted: predictedValue,
        confidence: i < 3 ? 'high' : i < 5 ? 'medium' : 'low'
      });
    }

    await saveDemandForecast(forecasts, tenantId);
    return forecasts;
  } catch (err) {
    logger.error('[ML] Error forecasting demand:', (err as Error).message);
    const hist = demandModel?.originalData || [10, 12, 8, 15, 11, 9, 14];
    const stats = predictWithStatistical([...hist], days, 7);
    return stats.map((s, i) => {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + i + 1);
      return {
        date: nextDate.toISOString().split('T')[0],
        predicted: s.value,
        confidence: 'low',
        reason: 'fallback'
      };
    });
  }
};

export const analyzeOptimalSchedules = async (tenantId?: string): Promise<ScheduleRecommendation[]> => {
  logger.info('[ML] Analyzing optimal schedules...');

  try {
    const cacheKey = tenantId ? `tenant:${tenantId}:analysis:schedules` : 'analysis:schedules';
    const cached = await mlCache.get(cacheKey) as ScheduleRecommendation[] | null;
    if (cached) {
      return cached;
    }

    const bookings = await pool.query(`
      SELECT 
        EXTRACT(DOW FROM date) as day,
        EXTRACT(HOUR FROM time) as hour,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM bookings
      WHERE date >= NOW() - INTERVAL '3 months'
        ${tenantId ? 'AND tenant_id = $1' : ''}
      GROUP BY EXTRACT(DOW FROM date), EXTRACT(HOUR FROM time)
    `, tenantId ? [tenantId] : []);

    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const hours = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

    const scheduleData: Record<number, Record<string, { demand: number; noShowRate: number }>> = {};
    for (let d = 1; d <= 5; d++) {
      scheduleData[d] = {};
      hours.forEach(h => {
        scheduleData[d][h] = { demand: 0, noShowRate: 0 };
      });
    }

    bookings.rows.forEach((b: Record<string, unknown>) => {
      const day = parseInt(String(b.day));
      const hour = parseInt(String(b.hour));
      if (day >= 1 && day <= 5) {
        const hourStr = `${hour.toString().padStart(2, '0')}:00`;
        if (scheduleData[day][hourStr]) {
          scheduleData[day][hourStr] = {
            demand: parseInt(String(b.count)),
            noShowRate: parseInt(String(b.count)) > 0 ? parseInt(String(b.cancelled)) / parseInt(String(b.count)) : 0
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
        if (score > bestScore) {
          bestScore = score;
          bestHour = hour;
        }
      });

      recommendations.push({
        day: days[day],
        bestTime: bestHour,
        occupancy: Math.min(100, Math.round(bestScore * 10) || 50),
        factors: scheduleData[day]
      });
    }

    await mlCache.set(cacheKey, recommendations, 15 * 60 * 1000);
    return recommendations;
  } catch (err) {
    logger.error('[ML] Error analyzing schedules:', (err as Error).message);
    return [];
  }
};

export const trainVitalSignsAnomalyDetector = async (tenantId?: string): Promise<TrainingResult> => {
  const startTime = Date.now();
  logger.info('[ML] Training vital signs anomaly detector (enhanced)...');

  try {
    const cacheKey = tenantId ? `tenant:${tenantId}:model:vitals` : 'model:vitals';
    const cached = await mlCache.get(cacheKey) as { model: { mean: number[]; std: number[]; threshold: number; trained: boolean } } | null;
    if (cached) {
      vitalAnomalyModel = cached.model;
      logger.info('[ML] Vital signs model loaded from cache');
      trackTrainingMetric(true, Date.now() - startTime);
      return { trained: true, cached: true };
    }

    const records = await pool.query(`
      SELECT vital_signs
      FROM clinical_records
      WHERE vital_signs IS NOT NULL
        AND vital_signs != '{}'
        ${tenantId ? 'AND tenant_id = $1' : ''}
    `, tenantId ? [tenantId] : []);

    if (records.rows.length < 20) {
      logger.warn('[ML] Insufficient data for vital signs detector');
      trackTrainingMetric(false, Date.now() - startTime);
      return { trained: false, reason: 'insufficient_data' };
    }

    const features: number[][] = records.rows
      .filter(r => r.vital_signs)
      .map(r => {
        const vs = r.vital_signs as Record<string, unknown> | undefined;
        if (!vs) return [120, 80, 70, 36.5];
        const systolic = parseInt((vs.pressure as string)?.split('/')[0] || '120');
        const diastolic = parseInt((vs.pressure as string)?.split('/')[1] || '80');
        const heartRate = parseInt(String(vs.heartRate || '70'));
        const temp = parseFloat(String(vs.temperature || '36.5'));
        return [systolic, diastolic, heartRate, temp];
      })
      .filter((f): f is number[] => f[0] > 0);

    if (features.length < 20) {
      return { trained: false, reason: 'insufficient_valid_data' };
    }

    const mean = features.reduce((acc, f) => acc.map((v, i) => v + f[i]), [0, 0, 0, 0])
      .map(v => v / features.length);

    const std = features[0].map((_, i) => {
      const variance = features.reduce((sum, f) => sum + Math.pow(f[i] - mean[i], 2), 0) / features.length;
      return Math.sqrt(variance) || 1;
    });

    vitalAnomalyModel = {
      mean,
      std,
      threshold: 2.0,
      trained: true
    };

    await mlCache.set(cacheKey, { model: vitalAnomalyModel }, 30 * 60 * 1000);
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

const calculateCardiovascularRisk = (
  systolic: number,
  diastolic: number,
  heartRate: number
): { level: string; score: number; factors: string[] } => {
  const factors: string[] = [];
  let score = 0;

  if (systolic >= 180 || diastolic >= 120) {
    score += 3;
    factors.push('Hypertensive crisis');
  } else if (systolic >= 160 || diastolic >= 100) {
    score += 2;
    factors.push('Stage 2 hypertension');
  } else if (systolic >= 140 || diastolic >= 90) {
    score += 1;
    factors.push('Stage 1 hypertension');
  }

  if (systolic >= 130 && systolic < 140) {
    score += 1;
    factors.push('Elevated');
  }

  if (diastolic >= 80 && diastolic < 90) {
    score += 1;
    factors.push('Diastolic elevated');
  }

  if (heartRate > 100) {
    score += 2;
    factors.push('Tachycardia');
  } else if (heartRate < 60) {
    score += 1;
    factors.push('Bradycardia');
  }

  if (systolic < 90) {
    score += 2;
    factors.push('Hypotension');
  }

  let level = 'low';
  if (score >= 4) level = 'high';
  else if (score >= 2) level = 'medium';

  return { level, score, factors };
};

export const analyzeVitalSigns = async (vitalSigns?: Record<string, unknown>, tenantId?: string): Promise<VitalSignsAnalysis> => {
  if (!vitalAnomalyModel || !vitalAnomalyModel.trained) {
    const result = await withTrainingLock('vitals', () => trainVitalSignsAnomalyDetector(tenantId));
    if (!result.trained) {
      return { anomaly: false, score: 0, warnings: [], values: { systolic: 120, diastolic: 80, heartRate: 70, temp: 36.5 }, normalRanges: { systolic: { min: 0, max: 0 }, diastolic: { min: 0, max: 0 }, heartRate: { min: 0, max: 0 }, temperature: { min: '0', max: '0' } }, reason: 'model_not_trained' };
    }
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
    
    if (cvRisk.level === 'high') {
      warnings.push(`Cardiovascular risk: ${cvRisk.level} (score: ${cvRisk.score})`);
      warnings.push(...cvRisk.factors);
    } else if (cvRisk.level === 'medium') {
      warnings.push(`Cardiovascular risk: ${cvRisk.level}`);
      warnings.push(...cvRisk.factors);
    }

    const overallAnomaly = isAnomaly || cvRisk.level === 'high';

    return {
      anomaly: overallAnomaly,
      score: Math.round(maxScore * 100) / 100,
      warnings,
      values: { systolic, diastolic, heartRate, temp },
      normalRanges: {
        systolic: { min: Math.round(vitalAnomalyModel!.mean![0] - 2 * vitalAnomalyModel!.std![0]), max: Math.round(vitalAnomalyModel!.mean![0] + 2 * vitalAnomalyModel!.std![0]) },
        diastolic: { min: Math.round(vitalAnomalyModel!.mean![1] - 2 * vitalAnomalyModel!.std![1]), max: Math.round(vitalAnomalyModel!.mean![1] + 2 * vitalAnomalyModel!.std![1]) },
        heartRate: { min: Math.round(vitalAnomalyModel!.mean![2] - 2 * vitalAnomalyModel!.std![2]), max: Math.round(vitalAnomalyModel!.mean![2] + 2 * vitalAnomalyModel!.std![2]) },
        temperature: { min: (vitalAnomalyModel!.mean![3] - 2 * vitalAnomalyModel!.std![3]).toFixed(1), max: (vitalAnomalyModel!.mean![3] + 2 * vitalAnomalyModel!.std![3]).toFixed(1) }
      },
      cardiovascularRisk: cvRisk.level,
      cardiovascularFactors: cvRisk.factors
    };
  } catch (err) {
    logger.error('[ML] Error analyzing vital signs:', (err as Error).message);
    return { anomaly: false, score: 0, warnings: [], values: { systolic: 120, diastolic: 80, heartRate: 70, temp: 36.5 }, normalRanges: { systolic: { min: 0, max: 0 }, diastolic: { min: 0, max: 0 }, heartRate: { min: 0, max: 0 }, temperature: { min: '0', max: '0' } }, error: (err as Error).message };
  }
};

export const getModelStatus = async (tenantId?: string): Promise<ModelStatus> => {
  return {
    noShowModel: noShowModel?.trained ? 'trained' : 'not_trained',
    diagnosisModel: diagnosisModel?.trained ? 'trained' : 'not_trained',
    demandModel: demandModel?.trained ? 'trained' : 'not_trained',
    vitalAnomalyModel: vitalAnomalyModel?.trained ? 'trained' : 'not_trained',
    cacheStats: mlCache.getStats()
  };
};

export const trainAllModels = async (tenantId?: string): Promise<TrainAllResults> => {
  const results: TrainAllResults = {
    noShow: { trained: false },
    diagnosis: { trained: false },
    demand: { trained: false },
    vitals: { trained: false },
    totalDuration: 0
  };
  const startTime = Date.now();

  try {
    const [noShow, diagnosis, demand, vitals] = await Promise.all([
      trainNoShowModel(tenantId),
      trainDiagnosisClassifier(tenantId),
      trainDemandForecastModel(tenantId),
      trainVitalSignsAnomalyDetector(tenantId)
    ]);

    results.noShow = noShow;
    results.diagnosis = diagnosis;
    results.demand = demand;
    results.vitals = vitals;
    results.totalDuration = Date.now() - startTime;

    logger.info('[ML] All models trained:', results);
    return results;
  } catch (err) {
    logger.error('[ML] Error training all models:', (err as Error).message);
    return { ...results, error: (err as Error).message, partial: results } as unknown as TrainAllResults;
  }
};

export const disposeAllModels = (tenantId?: string): void => {
  if (noShowModel) { noShowModel.dispose(); noShowModel = null; }
  if (diagnosisModel) { diagnosisModel.dispose(); diagnosisModel = null; }
  if (demandModel) { demandModel.dispose(); demandModel = null; }
  logger.info('[ML] All models disposed');
};

export const savePrediction = async (
  modelType: string,
  inputData: Record<string, unknown>,
  result: Record<string, unknown>,
  options?: { doctorId?: number; userId?: number; bookingId?: number },
  tenantId?: string
): Promise<void> => {
  try {
    const confidence = (result as unknown as PredictionResult).confidence || 'low';
    const columns = `model_type, input_data, prediction_result, confidence, doctor_id, user_id, booking_id${tenantId ? ', tenant_id' : ''}`;
    const values = `$1, $2, $3, $4, $5, $6, $7${tenantId ? ', $8' : ''}`;
    const params: (string | number | undefined)[] = [modelType, JSON.stringify(inputData), JSON.stringify(result), confidence, options?.doctorId, options?.userId, options?.bookingId];
    if (tenantId) params.push(tenantId);
    await pool.query(
      `INSERT INTO ml_prediction_history (${columns}) VALUES (${values})`,
      params
    );
  } catch (err) {
    logger.error('[ML] Error saving prediction:', (err as Error).message);
  }
};

export const saveModelMetrics = async (
  modelType: string,
  duration: number,
  samples: number,
  accuracy?: number,
  loss?: number,
  error?: string,
  tenantId?: string
): Promise<void> => {
  try {
    const status = error ? 'error' : 'success';
    const columns = `model_type, duration_ms, samples_used, accuracy, loss_value, status, error_message${tenantId ? ', tenant_id' : ''}`;
    const values = `$1, $2, $3, $4, $5, $6, $7${tenantId ? ', $8' : ''}`;
    const params: (string | number | undefined)[] = [modelType, duration, samples, accuracy, loss, status, error];
    if (tenantId) params.push(tenantId);
    await pool.query(
      `INSERT INTO ml_model_metrics (${columns}) VALUES (${values})`,
      params
    );
  } catch (err) {
    logger.error('[ML] Error saving metrics:', (err as Error).message);
  }
};

export const saveDemandForecast = async (
  forecasts: ForecastResult[],
  tenantId?: string
): Promise<void> => {
  try {
    for (const f of forecasts) {
      const columns = `date, predicted_demand, confidence${tenantId ? ', tenant_id' : ''}`;
      const values = `$1, $2, $3${tenantId ? ', $4' : ''}`;
      const params: (string | number)[] = [f.date, f.predicted, f.confidence];
      if (tenantId) params.push(tenantId);
      await pool.query(
        `INSERT INTO ml_demand_forecast (${columns}) VALUES (${values})`,
        params
      );
    }
  } catch (err) {
    logger.error('[ML] Error saving demand forecast:', (err as Error).message);
  }
};

export const getPredictionHistory = async (
  modelType?: string,
  limit = 100,
  tenantId?: string
): Promise<Record<string, unknown>[]> => {
  try {
    let query: string;
    const params: (string | number)[] = [];
    
    if (modelType && tenantId) {
      query = `SELECT * FROM ml_prediction_history WHERE model_type = $1 AND tenant_id = $2 ORDER BY prediction_date DESC LIMIT $3`;
      params.push(modelType, tenantId, limit);
    } else if (modelType) {
      query = `SELECT * FROM ml_prediction_history WHERE model_type = $1 ORDER BY prediction_date DESC LIMIT $2`;
      params.push(modelType, limit);
    } else if (tenantId) {
      query = `SELECT * FROM ml_prediction_history WHERE tenant_id = $1 ORDER BY prediction_date DESC LIMIT $2`;
      params.push(tenantId, limit);
    } else {
      query = `SELECT * FROM ml_prediction_history ORDER BY prediction_date DESC LIMIT $1`;
      params.push(limit);
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    logger.error('[ML] Error getting prediction history:', (err as Error).message);
    return [];
  }
};

export const getModelMetricsHistory = async (
  modelType?: string,
  limit = 50,
  tenantId?: string
): Promise<Record<string, unknown>[]> => {
  try {
    let query: string;
    const params: (string | number)[] = [];
    
    if (modelType && tenantId) {
      query = `SELECT * FROM ml_model_metrics WHERE model_type = $1 AND tenant_id = $2 ORDER BY trained_at DESC LIMIT $3`;
      params.push(modelType, tenantId, limit);
    } else if (modelType) {
      query = `SELECT * FROM ml_model_metrics WHERE model_type = $1 ORDER BY trained_at DESC LIMIT $2`;
      params.push(modelType, limit);
    } else if (tenantId) {
      query = `SELECT * FROM ml_model_metrics WHERE tenant_id = $1 ORDER BY trained_at DESC LIMIT $2`;
      params.push(tenantId, limit);
    } else {
      query = `SELECT * FROM ml_model_metrics ORDER BY trained_at DESC LIMIT $1`;
      params.push(limit);
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    logger.error('[ML] Error getting metrics history:', (err as Error).message);
    return [];
  }
};

export const getDemandForecastHistory = async (
  startDate?: string,
  endDate?: string,
  limit = 30,
  tenantId?: string
): Promise<Record<string, unknown>[]> => {
  try {
    const params: (string | number)[] = [];
    
    if (startDate && endDate && tenantId) {
      params.push(startDate, endDate, tenantId, limit);
      const result = await pool.query(
        `SELECT * FROM ml_demand_forecast WHERE date BETWEEN $1 AND $2 AND tenant_id = $3 ORDER BY date DESC LIMIT $4`,
        params
      );
      return result.rows;
    }
    
    if (startDate && endDate) {
      params.push(startDate, endDate, limit);
      const result = await pool.query(
        `SELECT * FROM ml_demand_forecast WHERE date BETWEEN $1 AND $2 ORDER BY date DESC LIMIT $3`,
        params
      );
      return result.rows;
    }
    
    if (tenantId) {
      params.push(tenantId, limit);
      const result = await pool.query(
        `SELECT * FROM ml_demand_forecast WHERE tenant_id = $1 ORDER BY date DESC LIMIT $2`,
        params
      );
      return result.rows;
    }
    
    params.push(limit);
    const result = await pool.query(
      `SELECT * FROM ml_demand_forecast ORDER BY date DESC LIMIT $1`,
      params
    );
    return result.rows;
  } catch (err) {
    logger.error('[ML] Error getting forecast history:', (err as Error).message);
    return [];
  }
};
