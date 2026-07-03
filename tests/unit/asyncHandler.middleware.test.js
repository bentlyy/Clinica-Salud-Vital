import { describe, it, expect, vi } from 'vitest';
import { asyncHandler } from '../../src/middlewares/asyncHandler.middleware.js';

describe('asyncHandler', () => {
  it('calls the wrapped function with req, res, next', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const wrapped = asyncHandler(fn);
    const req = {};
    const res = {};
    const next = vi.fn();

    await wrapped(req, res, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('passes thrown error to next', async () => {
    const error = new Error('test error');
    const fn = vi.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(fn);
    const next = vi.fn();

    await wrapped({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('works with non-error rejections', async () => {
    const fn = vi.fn().mockRejectedValue('string error');
    const wrapped = asyncHandler(fn);
    const next = vi.fn();

    await wrapped({}, {}, next);

    expect(next).toHaveBeenCalledWith('string error');
  });
});
