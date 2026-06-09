import { logger } from '../../utils/logger.js';
import type { TensorFlowModule, SequentialModel, VitalAnomalyModel } from './ml.types.js';

export const isMLSimplified = (): boolean => process.env.ML_SIMPLIFIED === 'true';

export let tf: TensorFlowModule | null = null;
export let tfLoaded = false;
export let noShowModel: SequentialModel | null = null;
export let diagnosisModel: SequentialModel | null = null;
export let demandModel: SequentialModel | null = null;
export let vitalAnomalyModel: VitalAnomalyModel | null = null;

export function setNoShowModel(m: SequentialModel | null) { noShowModel = m; }
export function setDiagnosisModel(m: SequentialModel | null) { diagnosisModel = m; }
export function setDemandModel(m: SequentialModel | null) { demandModel = m; }
export function setVitalAnomalyModel(m: VitalAnomalyModel | null) { vitalAnomalyModel = m; }

export const trainingLocks: Record<string, Promise<unknown> | null> = {};

export const withTrainingLock = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
  if (trainingLocks[key]) return trainingLocks[key] as Promise<T>;
  trainingLocks[key] = fn().finally(() => { trainingLocks[key] = null; });
  return trainingLocks[key] as Promise<T>;
};

export const getTF = async (): Promise<TensorFlowModule> => {
  if (!tfLoaded) {
    logger.info('[ML] Loading TensorFlow (lazy load)...');
    const tfModule = await import('@tensorflow/tfjs');
    tf = tfModule as unknown as TensorFlowModule;
    tfLoaded = true;
    logger.info('[ML] TensorFlow loaded');
  }
  return tf!;
};

export const normalizeData = (data: number[]): number[] => {
  if (!data || data.length === 0) return [];
  const min = Math.min(...data);
  const max = Math.max(...data);
  if (max === min) return data.map(() => 0.5);
  return data.map(v => (v - min) / (max - min));
};

export const normalizeZScore = (data: number[]): { normalized: number[]; mean: number; std: number } => {
  if (!data || data.length === 0) return { normalized: [], mean: 0, std: 1 };
  const mean = data.reduce((s, v) => s + v, 0) / data.length;
  const variance = data.reduce((s, v) => s + (v - mean) ** 2, 0) / data.length;
  const std = Math.sqrt(variance) || 1;
  return { normalized: data.map(v => (v - mean) / std), mean, std };
};

export const denormalize = (normalized: number[], originalData: number[]): number[] => {
  if (!originalData || originalData.length === 0) return normalized;
  const min = Math.min(...originalData);
  const max = Math.max(...originalData);
  if (max === min) return normalized;
  return normalized.map(v => Math.round(v * (max - min) + min));
};

export const safeDispose = (tensor: unknown): void => {
  if (tensor && typeof tensor === 'object' && 'dispose' in tensor && typeof (tensor as { dispose: () => void }).dispose === 'function') {
    try { (tensor as { dispose: () => void }).dispose(); } catch (e) { logger.warn('[ML] Error disposing tensor:', (e as Error).message); }
  }
};

export const trainWithTimeout = async <T>(trainingFn: () => Promise<T>, timeout = 60000): Promise<T> => {
  return Promise.race([
    trainingFn(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Training timeout')), timeout))
  ]);
};
