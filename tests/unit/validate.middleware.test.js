import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

import { validateZod } from '../../src/middlewares/validate.middleware.js';

function mockReq(body, params, query) {
  return { body: body || {}, params: params || {}, query: query || {} };
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

describe('validateZod', () => {
  const testSchema = z.object({
    email: z.string().email(),
    age: z.number().min(0),
  });

  it('calls next on valid body data', () => {
    const req = mockReq({ email: 'test@test.com', age: 25 });
    const res = mockRes();
    const next = vi.fn();

    validateZod(testSchema, 'body')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid body data', () => {
    const req = mockReq({ email: 'not-an-email', age: -1 });
    const res = mockRes();
    const next = vi.fn();

    validateZod(testSchema, 'body')(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Validation failed') })
    );
  });

  it('validates params source', () => {
    const paramsSchema = z.object({ id: z.string().regex(/^\d+$/) });
    const req = mockReq({}, { id: 'abc' });
    const res = mockRes();
    const next = vi.fn();

    validateZod(paramsSchema, 'params')(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 })
    );
  });

  it('validates query source', () => {
    const querySchema = z.object({ page: z.string().regex(/^\d+$/) });
    const req = mockReq({}, {}, { page: 'abc' });
    const res = mockRes();
    const next = vi.fn();

    validateZod(querySchema, 'query')(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 })
    );
  });

  it('passes non-Zod errors to next', () => {
    const badSchema = {
      parse: () => { throw new Error('Unexpected'); },
    };
    const req = mockReq({ email: 'test@test.com' });
    const res = mockRes();
    const next = vi.fn();

    validateZod(badSchema, 'body')(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
