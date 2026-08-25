import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
}));

import { recordBookingStatusChange } from '../../src/shared/booking-history.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('recordBookingStatusChange', () => {
  it('inserts a status change record with all fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await recordBookingStatusChange(42, {
      toStatus: 'confirmed',
      fromStatus: 'pending',
      actorType: 'doctor',
      changedByUserId: 10,
      changedByRole: 'doctor',
      reason: 'Doctor confirmed',
      notes: 'Morning appointment',
    });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO booking_status_history');
    expect(params).toEqual([42, 'pending', 'confirmed', 'doctor', 10, 'doctor', 'Doctor confirmed', 'Morning appointment']);
  });

  it('uses defaults for optional fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await recordBookingStatusChange(1, { toStatus: 'cancelled' });

    const [, params] = mockQuery.mock.calls[0];
    expect(params[3]).toBe('system'); // default actorType
    expect(params[4]).toBeNull();
    expect(params[5]).toBeNull();
    expect(params[6]).toBeNull();
    expect(params[7]).toBeNull();
  });

  it('accepts a custom queryable client', async () => {
    const clientQuery = vi.fn().mockResolvedValueOnce({ rows: [] });

    await recordBookingStatusChange(99, { toStatus: 'completed' }, { query: clientQuery });

    expect(clientQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('handles null fromStatus', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await recordBookingStatusChange(5, {
      toStatus: 'pending',
      fromStatus: null,
    });

    const [, params] = mockQuery.mock.calls[0];
    expect(params[1]).toBeNull();
  });

  it('handles all actor types', async () => {
    const actorTypes = ['system', 'user', 'guest', 'doctor', 'admin'];

    for (const actorType of actorTypes) {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await recordBookingStatusChange(1, { toStatus: 'test', actorType });
      const [, params] = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
      expect(params[3]).toBe(actorType);
    }
  });
});
