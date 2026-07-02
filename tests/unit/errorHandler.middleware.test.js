import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler, notFoundHandler } from '../../src/middlewares/errorHandler.middleware.js';

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: mockLogger,
}));

function mockReq(url, method) {
  return { originalUrl: url || '/test', method: method || 'GET' };
}

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('errorHandler', () => {
  it('responds with 500 and message', () => {
    const err = new Error('Something broke');
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  it('uses statusCode from error if present', () => {
    const err = new Error('Not found');
    err.statusCode = 404;
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('logs 5xx as error', () => {
    const err = new Error('Server error');
    err.statusCode = 500;
    const req = mockReq('/api/test', 'POST');
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('logs 4xx as warning', () => {
    const err = new Error('Bad request');
    err.statusCode = 400;
    const req = mockReq('/api/test', 'POST');
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('includes stack in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const err = new Error('Dev error');
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Dev error', stack: expect.any(String) })
    );
    process.env.NODE_ENV = originalEnv;
  });
});

describe('notFoundHandler', () => {
  it('creates 404 error and passes to next', () => {
    const req = mockReq('/nonexistent', 'DELETE');
    const res = mockRes();
    const next = vi.fn();

    notFoundHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('not found'), statusCode: 404 })
    );
  });
});
