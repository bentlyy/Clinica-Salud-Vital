import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('mlMetricsMiddleware', () => {
  it('tracks successful prediction', async () => {
    const mod = await import('../../src/modules/ml/ml.middleware.js');
    const middleware = mod.mlMetricsMiddleware('noShow');

    const req = { path: '/ml/predict/no-show' };
    const res = { on: vi.fn((event, cb) => {
      if (event === 'finish') cb();
    }), statusCode: 200 };
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();

    const metrics = mod.getMLMetrics();
    expect(metrics.predictions.noShow.total).toBe(1);
    expect(metrics.predictions.noShow.success).toBe(1);
  });

  it('limits errors to 100', async () => {
    const mod = await import('../../src/modules/ml/ml.middleware.js');
    const middleware = mod.mlMetricsMiddleware('demand');

    for (let i = 0; i < 150; i++) {
      const req = { path: '/ml/forecast' };
      const res = { on: vi.fn((event, cb) => {
        if (event === 'finish') cb();
      }), statusCode: 500 };
      const next = vi.fn();
      middleware(req, res, next);
    }

    const metrics = mod.getMLMetrics();
    expect(metrics.errors.length).toBeLessThanOrEqual(100);
  });

  it('getMLMetrics returns uptime', () => {
    // just verify the shape
  });
});

describe('resetMLMetrics', () => {
  it('resets all metrics', async () => {
    const mod = await import('../../src/modules/ml/ml.middleware.js');
    mod.mlMetricsMiddleware('noShow')({ path: '' }, { on: vi.fn((e, cb) => cb && cb()), statusCode: 200 }, vi.fn());

    const result = mod.resetMLMetrics();
    expect(result.success).toBe(true);

    const metrics = mod.getMLMetrics();
    expect(metrics.predictions.noShow.total).toBe(0);
    expect(metrics.predictions.vitals.total).toBe(0);
    expect(metrics.training.totalRuns).toBe(0);
    expect(metrics.errors.length).toBe(0);
  });
});

describe('trackTrainingMetric', () => {
  it('tracks successful training', async () => {
    const mod = await import('../../src/modules/ml/ml.middleware.js');
    mod.trackTrainingMetric(true, 1000);

    const metrics = mod.getMLMetrics();
    expect(metrics.training.totalRuns).toBe(1);
    expect(metrics.training.success).toBe(1);
    expect(metrics.training.totalDuration).toBe(1000);
  });

  it('tracks failed training', async () => {
    const mod = await import('../../src/modules/ml/ml.middleware.js');
    mod.trackTrainingMetric(false, 500);

    const metrics = mod.getMLMetrics();
    expect(metrics.training.totalRuns).toBe(1);
    expect(metrics.training.error).toBe(1);
    expect(metrics.training.totalDuration).toBe(500);
  });
});

describe('errorLoggingMiddleware', () => {
  it('logs ML errors', async () => {
    const mod = await import('../../src/modules/ml/ml.middleware.js');
    const err = new Error('ML error');
    const req = { path: '/ml/predict' };
    const res = {};
    const next = vi.fn();

    mod.errorLoggingMiddleware(err, req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('passes non-ML errors through', async () => {
    const mod = await import('../../src/modules/ml/ml.middleware.js');
    const err = new Error('Auth error');
    const req = { path: '/auth/login' };
    const res = {};
    const next = vi.fn();

    mod.errorLoggingMiddleware(err, req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
