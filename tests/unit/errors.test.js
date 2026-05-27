import { describe, it, expect } from 'vitest';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from '../../src/utils/errors.js';

describe('BadRequestError', () => {
  it('creates with message and status 400', () => {
    const err = new BadRequestError('bad input');
    expect(err.message).toBe('bad input');
    expect(err.statusCode).toBe(400);
  });
});

describe('NotFoundError', () => {
  it('creates with message and status 404', () => {
    const err = new NotFoundError('not found');
    expect(err.message).toBe('not found');
    expect(err.statusCode).toBe(404);
  });

  it('uses default message', () => {
    const err = new NotFoundError();
    expect(err.message).toBe('Resource not found');
  });
});

describe('UnauthorizedError', () => {
  it('creates with message and status 401', () => {
    const err = new UnauthorizedError('unauthorized');
    expect(err.message).toBe('unauthorized');
    expect(err.statusCode).toBe(401);
  });

  it('uses default message', () => {
    const err = new UnauthorizedError();
    expect(err.message).toBe('Unauthorized');
  });
});

describe('ForbiddenError', () => {
  it('creates with message and status 403', () => {
    const err = new ForbiddenError('forbidden');
    expect(err.message).toBe('forbidden');
    expect(err.statusCode).toBe(403);
  });

  it('uses default message', () => {
    const err = new ForbiddenError();
    expect(err.message).toBe('Forbidden');
  });
});
