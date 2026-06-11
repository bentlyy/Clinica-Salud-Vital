import { logger } from '../../utils/logger.js';
import type { StatisticalModel, VitalAnomalyModel } from './ml.types.js';

export const isMLSimplified = (): boolean => true;

export let noShowModel: StatisticalModel | null = null;
export let demandModel: StatisticalModel | null = null;
export let vitalAnomalyModel: VitalAnomalyModel | null = null;

export function setNoShowModel(m: StatisticalModel | null) { noShowModel = m; }
export function setDemandModel(m: StatisticalModel | null) { demandModel = m; }
export function setVitalAnomalyModel(m: VitalAnomalyModel | null) { vitalAnomalyModel = m; }

export const trainingLocks: Record<string, Promise<unknown> | null> = {};

export const withTrainingLock = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
  if (trainingLocks[key]) return trainingLocks[key] as Promise<T>;
  trainingLocks[key] = fn().finally(() => { trainingLocks[key] = null; });
  return trainingLocks[key] as Promise<T>;
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
