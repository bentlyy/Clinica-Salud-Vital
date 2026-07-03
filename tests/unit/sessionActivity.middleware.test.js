import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn().mockResolvedValue({ rowCount: 1 }),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { warn: vi.fn() },
}));

import { trackActivity } from '../../src/middlewares/sessionActivity.middleware.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('trackActivity', () => {
  it('updates last_activity_at when user is present', () => {
    const req = { user: { id: 42 } };
    const next = vi.fn();

    trackActivity(req, {}, next);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users'),
      [42]
    );
    expect(next).toHaveBeenCalled();
  });

  it('does nothing when user is not present', () => {
    const req = {};
    const next = vi.fn();

    trackActivity(req, {}, next);

    expect(mockQuery).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('logs warning on query failure without throwing', () => {
    mockQuery.mockRejectedValue(new Error('DB error'));
    const req = { user: { id: 1 } };
    const next = vi.fn();

    trackActivity(req, {}, next);

    expect(next).toHaveBeenCalled();
  });

  it('handles user with additional properties', () => {
    const req = { user: { id: 99, role: 'admin', name: 'Test' } };
    const next = vi.fn();

    trackActivity(req, {}, next);

    expect(mockQuery.mock.calls[0][1]).toEqual([99]);
    expect(next).toHaveBeenCalled();
  });
});
