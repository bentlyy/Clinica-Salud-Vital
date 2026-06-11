import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

interface PredictionMetrics {
  total: number;
  success: number;
  error: number;
  avgTime: number;
}

interface TrainingMetrics {
  totalRuns: number;
  success: number;
  error: number;
  totalDuration: number;
}

interface MLError {
  type: string;
  status: number;
  path: string;
  timestamp: string;
}

interface MLMetricsData {
  predictions: {
    noShow: PredictionMetrics;
    demand: PredictionMetrics;
    vitals: PredictionMetrics;
  };
  training: TrainingMetrics;
  errors: MLError[];
}

const mlMetrics: MLMetricsData = {
  predictions: {
    noShow: { total: 0, success: 0, error: 0, avgTime: 0 },
    demand: { total: 0, success: 0, error: 0, avgTime: 0 },
    vitals: { total: 0, success: 0, error: 0, avgTime: 0 },
  },
  training: {
    totalRuns: 0,
    success: 0,
    error: 0,
    totalDuration: 0,
  },
  errors: [],
};

export const mlMetricsMiddleware = (type: keyof MLMetricsData['predictions']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const isSuccess = res.statusCode >= 200 && res.statusCode < 400;

      if (mlMetrics.predictions[type]) {
        mlMetrics.predictions[type].total++;
        if (isSuccess) {
          mlMetrics.predictions[type].success++;
        } else {
          mlMetrics.predictions[type].error++;
        }

        const current = mlMetrics.predictions[type].avgTime;
        const count = mlMetrics.predictions[type].total;
        mlMetrics.predictions[type].avgTime = ((current * (count - 1)) + duration) / count;
      }

      if (!isSuccess && res.statusCode >= 400) {
        mlMetrics.errors.push({
          type,
          status: res.statusCode,
          path: req.path,
          timestamp: new Date().toISOString(),
        });

        if (mlMetrics.errors.length > 100) {
          mlMetrics.errors = mlMetrics.errors.slice(-100);
        }
      }

      logger.debug(`[ML Metrics] ${type} - ${res.statusCode} - ${duration}ms`);
    });

    next();
  };
};

export const getMLMetrics = () => {
  const uptime = process.uptime();
  return {
    predictions: mlMetrics.predictions,
    training: mlMetrics.training,
    errors: mlMetrics.errors.slice(-20),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
  };
};

export const resetMLMetrics = () => {
  (Object.keys(mlMetrics.predictions) as Array<keyof MLMetricsData['predictions']>).forEach(key => {
    mlMetrics.predictions[key] = { total: 0, success: 0, error: 0, avgTime: 0 };
  });
  mlMetrics.training = { totalRuns: 0, success: 0, error: 0, totalDuration: 0 };
  mlMetrics.errors = [];
  logger.info('[ML Metrics] Reset');
  return { success: true };
};

export const trackTrainingMetric = (success: boolean, duration: number): void => {
  mlMetrics.training.totalRuns++;
  if (success) {
    mlMetrics.training.success++;
  } else {
    mlMetrics.training.error++;
  }
  mlMetrics.training.totalDuration += duration;
};

export const errorLoggingMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/ml/')) {
    logger.error(`[ML Error] ${err.message}`, {
      path: req.path,
      method: req.method,
      stack: err.stack,
    });
  }
  next(err);
};
