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
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const err = new Error('Something broke');
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);
    process.env.NODE_ENV = originalEnv;

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

  it('never exposes stack trace in response body', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const err = new Error('Dev error');
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.not.objectContaining({ stack: expect.any(String) })
    );
    process.env.NODE_ENV = originalEnv;
  });

  it('shows original message for client errors (4xx)', () => {
    const err = new Error('Not found');
    err.statusCode = 404;
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Not found' })
    );
  });

  it('masks internal error message for server errors (5xx)', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const err = new Error('Database connection failed');
    err.statusCode = 500;
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);
    process.env.NODE_ENV = originalEnv;

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Internal server error' })
    );
  });

  it('does not log the query string (PHI/token leakage)', () => {
    const err = new Error('Bad request');
    err.statusCode = 400;
    const req = mockReq('/api/patients?token=secret-jwt&rut=12345678-9', 'GET');
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    const meta = mockLogger.warn.mock.calls[0][1];
    expect(meta.url).toBe('/api/patients');
    expect(JSON.stringify(mockLogger.warn.mock.calls)).not.toContain('secret-jwt');
  });

  it('does not log the query string for server errors', () => {
    const err = new Error('Boom');
    err.statusCode = 500;
    const req = mockReq('/api/bookings/confirm?token=abc.def.ghi', 'GET');
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    const meta = mockLogger.error.mock.calls[0][1];
    expect(meta.url).toBe('/api/bookings/confirm');
    expect(JSON.stringify(mockLogger.error.mock.calls)).not.toContain('abc.def.ghi');
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

  it('does not log the query string', () => {
    const req = mockReq('/nonexistent?token=secret', 'GET');
    const res = mockRes();
    const next = vi.fn();

    notFoundHandler(req, res, next);

    const meta = mockLogger.warn.mock.calls[0][1];
    expect(meta.url).toBe('/nonexistent');
  });
});
