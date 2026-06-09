export interface TensorFlowModule {
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

export interface SequentialModel {
  add: (layer: Layer) => void;
  compile: (config: { optimizer: string | Optimizer; loss: string; metrics?: string[] }) => void;
  fit: (xs: unknown, ys: unknown, config: { epochs: number; verbose: number }) => Promise<History>;
  predict: (input: unknown) => Tensor;
  dispose: () => void;
  trained?: boolean;
  lstmTrained?: boolean;
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

export interface Layer {
  units: number;
}

export interface Optimizer {}

export interface Tensor {
  data: () => Promise<Float32Array>;
  dispose: () => void;
}

export interface History {}

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

export interface DiagnosisPrediction {
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
  diagnosisModel: string;
  demandModel: string;
  vitalAnomalyModel: string;
  cacheStats: ReturnType<typeof import('./ml.cache.js')['mlCache']['getStats']>;
}

export interface TrainAllResults {
  noShow: TrainingResult;
  diagnosis: TrainingResult;
  demand: TrainingResult;
  vitals: TrainingResult;
  totalDuration: number;
  error?: string;
  partial?: Record<string, TrainingResult>;
}

export type VitalAnomalyModel = { mean: number[]; std: number[]; threshold: number; trained: boolean };
