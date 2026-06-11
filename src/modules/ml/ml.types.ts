export interface TrainingResult {
  trained: boolean;
  cached?: boolean;
  reason?: string;
  samples?: number;
  duration?: number;
  diagnoses?: number;
  dataPoints?: number;
  error?: string;
}

export interface PredictionResult {
  risk?: number;
  confidence: string;
  recommendation?: string;
  reason?: string;
  error?: string;
}

export interface ForecastResult {
  date: string;
  predicted: number;
  confidence: string;
  reason?: string;
}

export interface ScheduleRecommendation {
  day: string;
  bestTime: string;
  occupancy: number;
  factors: Record<string, { demand: number; noShowRate: number }>;
}

export interface VitalSignsAnalysis {
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

export interface ModelStatus {
  noShowModel: string;
  demandModel: string;
  vitalAnomalyModel: string;
  cacheStats: ReturnType<typeof import('./ml.cache.js')['mlCache']['getStats']>;
}

export interface TrainAllResults {
  noShow: TrainingResult;
  demand: TrainingResult;
  vitals: TrainingResult;
  totalDuration: number;
  error?: string;
  partial?: Record<string, TrainingResult>;
}

export interface StatisticalModel {
  trained: boolean;
  mean?: number[];
  std?: number[];
  threshold?: number;
  specialtyList?: string[];
  originalData?: number[];
  windowSize?: number;
}

export type VitalAnomalyModel = { mean: number[]; std: number[]; threshold: number; trained: boolean };
