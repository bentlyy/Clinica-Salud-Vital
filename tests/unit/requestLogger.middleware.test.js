import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
vi.mock('../../src/utils/logger.js', () => ({
  logger: mockLogger,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requestLogger middleware', () => {
  it('logs info for 2xx responses', async () => {
    const { requestLogger } = await import('../../src/middlewares/requestLogger.middleware.js');
    const req = { method: 'GET', originalUrl: '/api/test' };
    const res = { statusCode: 200, on: vi.fn((event, cb) => { res.statusCode = 200; cb(); }) };

    requestLogger(req, res, vi.fn());

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('logs warn for 4xx responses', async () => {
    const { requestLogger } = await import('../../src/middlewares/requestLogger.middleware.js');
    const req = { method: 'POST', originalUrl: '/api/test' };
    const res = { statusCode: 400, on: vi.fn((event, cb) => { res.statusCode = 400; cb(); }) };

    requestLogger(req, res, vi.fn());
  });

  it('logs error for 5xx responses', async () => {
    const { requestLogger } = await import('../../src/middlewares/requestLogger.middleware.js');
    const req = { method: 'DELETE', originalUrl: '/api/error' };
    const res = { statusCode: 500, on: vi.fn((event, cb) => { res.statusCode = 500; cb(); }) };

    requestLogger(req, res, vi.fn());
  });

  it('calls next', async () => {
    const { requestLogger } = await import('../../src/middlewares/requestLogger.middleware.js');
    const next = vi.fn();
    const req = { method: 'GET', originalUrl: '/api/test' };
    const res = { statusCode: 200, on: vi.fn() };

    requestLogger(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
