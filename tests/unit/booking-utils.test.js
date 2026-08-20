import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
  readPool: { query: mockQuery },
}));

vi.mock('../../src/shared/date.js', () => ({
  getDayOfWeek: vi.fn((d) => {
    const [y, m, day] = d.split('-').map(Number);
    const jsDay = new Date(y, m - 1, day).getDay();
    return jsDay === 0 ? 7 : jsDay;
  }),
}));

// Helper: 2030-06-18 is Tuesday (day 2), 2030-06-19 is Wednesday (day 3)

import {
  checkDoctorAvailability,
  checkDoctorExceptions,
  checkHolidayBlock,
  checkSlotOverlap,
  validateBookingSlot,
} from '../../src/shared/booking-utils.js';
import { BadRequestError } from '../../src/utils/errors.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkDoctorAvailability', () => {
  it('passes when doctor is available within a block', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ start_time: '09:00', end_time: '13:00' }],
    });
    await expect(checkDoctorAvailability(1, '2030-06-18', '10:00', 30, undefined, 'test-tenant')).resolves.toBeUndefined();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('doctor_availability'),
      [1, 2, 'test-tenant']
    );
  });

  it('throws when no availability rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(checkDoctorAvailability(1, '2030-06-17', '10:00', 30, undefined, 'test-tenant')).rejects.toThrow(BadRequestError);
  });

  it('throws when slot outside availability', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ start_time: '09:00', end_time: '13:00' }],
    });
    await expect(checkDoctorAvailability(1, '2030-06-18', '14:00', 30, undefined, 'test-tenant')).rejects.toThrow(BadRequestError);
  });

  it('queries with tenantId when provided', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ start_time: '09:00', end_time: '17:00' }],
    });
    await expect(checkDoctorAvailability(1, '2030-06-18', '09:00', 30, undefined, 'tenant-1')).resolves.toBeUndefined();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [1, 2, 'tenant-1']
    );
  });

  it('queries with default tenantId', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ start_time: '09:00', end_time: '17:00' }],
    });
    await expect(checkDoctorAvailability(1, '2030-06-18', '09:00', 30, undefined, 'default')).resolves.toBeUndefined();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [1, 2, 'default']
    );
  });
});

describe('checkDoctorExceptions', () => {
  it('passes when no exceptions exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(checkDoctorExceptions(1, '2030-06-17', '10:00', 30, undefined, 'test-tenant')).resolves.toBeUndefined();
  });

  it('throws on full day exception', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ is_full_day: true, start_time: null, end_time: null }],
    });
    await expect(checkDoctorExceptions(1, '2030-06-17', '10:00', 30, undefined, 'test-tenant')).rejects.toThrow(BadRequestError);
  });

  it('throws when time falls within exception range', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ is_full_day: false, start_time: '14:00', end_time: '15:00' }],
    });
    await expect(checkDoctorExceptions(1, '2030-06-17', '14:30', 30, undefined, 'test-tenant')).rejects.toThrow(BadRequestError);
  });

  it('passes when time is outside exception range', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ is_full_day: false, start_time: '14:00', end_time: '15:00' }],
    });
    await expect(checkDoctorExceptions(1, '2030-06-18', '10:00', 30, undefined, 'test-tenant')).resolves.toBeUndefined();
  });

  it('handles exception with only start_time (no end_time)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ is_full_day: false, start_time: '14:00', end_time: null }],
    });
    await expect(checkDoctorExceptions(1, '2030-06-18', '15:00', 30, undefined, 'test-tenant')).resolves.toBeUndefined();
  });

  it('queries with tenantId when provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(checkDoctorExceptions(1, '2030-06-17', '10:00', 30, undefined, 'tenant-1')).resolves.toBeUndefined();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [1, '2030-06-17', 'tenant-1']
    );
  });

  it('queries with default tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(checkDoctorExceptions(1, '2030-06-17', '10:00', 30, undefined, 'default')).resolves.toBeUndefined();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [1, '2030-06-17', 'default']
    );
  });
});

describe('checkSlotOverlap', () => {
  it('passes when no overlap exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(checkSlotOverlap(1, '2030-06-17', '10:00', 30, undefined, 'test-tenant')).resolves.toBeUndefined();
  });

  it('throws on overlap', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    await expect(checkSlotOverlap(1, '2030-06-17', '10:00', 30, undefined, 'test-tenant')).rejects.toThrow(BadRequestError);
  });

  it('queries with tenantId when provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(checkSlotOverlap(1, '2030-06-17', '10:00', 30, undefined, 'tenant-1')).resolves.toBeUndefined();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [1, '2030-06-17', '10:00', 30, 'tenant-1', null]
    );
  });

  it('queries with default tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(checkSlotOverlap(1, '2030-06-17', '10:00', 30, undefined, 'default')).resolves.toBeUndefined();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [1, '2030-06-17', '10:00', 30, 'default', null]
    );
  });

  it('ignores the booking being rescheduled when checking overlap', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(checkSlotOverlap(1, '2030-06-17', '10:00', 30, undefined, 'default', 42)).resolves.toBeUndefined();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [1, '2030-06-17', '10:00', 30, 'default', 42]
    );
  });
});

describe('checkHolidayBlock', () => {
  it('passes when no holiday exists for the date', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(checkHolidayBlock('2030-06-17', 'default')).resolves.toBeUndefined();
  });

  it('throws when the date is a holiday', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ name: 'Fiestas Patrias' }] });
    await expect(checkHolidayBlock('2030-06-17', 'default')).rejects.toThrow(BadRequestError);
  });
});

describe('validateBookingSlot', () => {
  it('delegates to all three checks with client', async () => {
    const mockDb = { query: mockQuery };
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ start_time: '09:00', end_time: '17:00' }] });
    mockQuery.mockResolvedValue({ rows: [] });

    await expect(validateBookingSlot({
      doctorId: 1,
      date: '2030-06-17',
      time: '10:00',
      duration: 30,
      tenantId: 'test-tenant',
      client: mockDb,
    })).resolves.toBeUndefined();
    expect(mockQuery).toHaveBeenCalled();
  });

  it('falls back to pool when client not provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ start_time: '09:00', end_time: '17:00' }] });
    mockQuery.mockResolvedValue({ rows: [] });

    await expect(validateBookingSlot({
      doctorId: 1,
      date: '2030-06-17',
      time: '10:00',
      duration: 30,
      tenantId: 'test-tenant',
    })).resolves.toBeUndefined();
    expect(mockQuery).toHaveBeenCalled();
  });

  it('throws when the date is a holiday', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ name: 'Feriado' }] });

    await expect(validateBookingSlot({
      doctorId: 1,
      date: '2030-06-17',
      time: '10:00',
      duration: 30,
      tenantId: 'test-tenant',
    })).rejects.toThrow(BadRequestError);
  });

  it('ignores the excluded booking when checking overlap', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ start_time: '09:00', end_time: '17:00' }] });
    mockQuery.mockResolvedValue({ rows: [] });

    await expect(validateBookingSlot({
      doctorId: 1,
      date: '2030-06-17',
      time: '10:00',
      duration: 30,
      tenantId: 'test-tenant',
      excludeBookingId: 7,
    })).resolves.toBeUndefined();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('id != $6'),
      [1, '2030-06-17', '10:00', 30, 'test-tenant', 7]
    );
  });
});
