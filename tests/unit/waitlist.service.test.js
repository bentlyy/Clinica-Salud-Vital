import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
  readPool: { query: mockQuery },
}));

vi.mock('../../src/shared/queue.service.js', () => ({
  enqueueJob: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import {
  joinWaitlist,
  leaveWaitlist,
  listMyWaitlist,
  listWaitlist,
  countWaitlistForSlot,
  notifyWaitlistForSlot,
} from '../../src/modules/waitlist/waitlist.service.js';
import { enqueueJob } from '../../src/shared/queue.service.js';
import { BadRequestError, NotFoundError } from '../../src/utils/errors.js';

const entryRow = {
  id: 1,
  tenant_id: 't',
  doctor_id: 2,
  user_id: 3,
  requested_date: '2030-06-20',
  status: 'waiting',
  notified_at: null,
  created_at: '2026-01-01',
  doctor_name: 'Dr. Test',
  patient_name: 'Paciente',
  patient_email: 'p@test.com',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('joinWaitlist', () => {
  it('throws when payload incomplete', async () => {
    await expect(joinWaitlist(3, 't', { doctor_id: 0, requested_date: '' })).rejects.toThrow(BadRequestError);
  });

  it('throws when doctor not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(joinWaitlist(3, 't', { doctor_id: 2, requested_date: '2030-06-20' })).rejects.toThrow(NotFoundError);
  });

  it('throws for a past date', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }] });
    await expect(joinWaitlist(3, 't', { doctor_id: 2, requested_date: '2020-01-01' })).rejects.toThrow(BadRequestError);
  });

  it('creates an entry', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }] });
    mockQuery.mockResolvedValueOnce({ rows: [entryRow] });

    const entry = await joinWaitlist(3, 't', { doctor_id: 2, requested_date: '2030-06-20' });

    expect(entry.id).toBe(1);
    expect(entry.doctor_name).toBe('Dr. Test');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO waitlist'),
      expect.any(Array)
    );
  });
});

describe('leaveWaitlist', () => {
  it('throws when entry not found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    await expect(leaveWaitlist(1, 3, 't')).rejects.toThrow(NotFoundError);
  });

  it('deletes the entry', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    await expect(leaveWaitlist(1, 3, 't')).resolves.toBeUndefined();
  });
});

describe('listMyWaitlist', () => {
  it('maps rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [entryRow] });
    const rows = await listMyWaitlist(3, 't');
    expect(rows).toHaveLength(1);
    expect(rows[0].patient_name).toBe('Paciente');
  });
});

describe('listWaitlist', () => {
  it('lists with all filters applied', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [entryRow] });
    const rows = await listWaitlist('t', { doctor_id: 2, requested_date: '2030-06-20', status: 'waiting' });

    expect(rows).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('w.doctor_id = $2'),
      ['t', 2, '2030-06-20', 'waiting']
    );
  });

  it('lists with no filters', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(listWaitlist('t')).resolves.toEqual([]);
  });
});

describe('countWaitlistForSlot', () => {
  it('returns the waiting count', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ cnt: 3 }] });
    await expect(countWaitlistForSlot(2, '2030-06-20', 't')).resolves.toBe(3);
  });

  it('returns 0 when no rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(countWaitlistForSlot(2, '2030-06-20', 't')).resolves.toBe(0);
  });
});

describe('notifyWaitlistForSlot', () => {
  it('does nothing when nobody is waiting', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await notifyWaitlistForSlot(2, '2030-06-20', 't');
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  it('emails the notified user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, user_id: 3 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ email: 'p@test.com', doctor_name: 'Dr. Test' }] });

    await notifyWaitlistForSlot(2, '2030-06-20', 't');

    expect(enqueueJob).toHaveBeenCalledWith('email:send', expect.objectContaining({ type: 'waitlist-slot-available' }));
  });
});
