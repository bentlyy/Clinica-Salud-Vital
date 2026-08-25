import { describe, it, expect, vi, beforeEach } from 'vitest';
import { correlationIdMiddleware } from '../../src/middlewares/correlationId.middleware.js';

describe('correlationIdMiddleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { headers: {} };
    res = { setHeader: vi.fn() };
    next = vi.fn();
  });

  it('generates a new correlation ID when none provided', () => {
    correlationIdMiddleware(req, res, next);

    expect(req.headers['x-request-id']).toBeDefined();
    expect(typeof req.headers['x-request-id']).toBe('string');
    expect(req.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('reuses existing X-Request-ID header', () => {
    req.headers['x-request-id'] = 'existing-id-123';

    correlationIdMiddleware(req, res, next);

    expect(req.headers['x-request-id']).toBe('existing-id-123');
  });

  it('sets the correlation ID on response header', () => {
    correlationIdMiddleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.headers['x-request-id']);
  });

  it('calls next()', () => {
    correlationIdMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('handles uppercase X-Request-ID header', () => {
    req.headers['x-request-id'] = 'uppercase-test';

    correlationIdMiddleware(req, res, next);

    expect(req.headers['x-request-id']).toBe('uppercase-test');
  });
});
