import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
}));

vi.mock('../../src/shared/queue.service.js', () => ({
  enqueueJob: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../src/shared/booking-history.js', () => ({
  recordBookingStatusChange: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/modules/waitlist/waitlist.service.js', () => ({
  notifyWaitlistForSlot: vi.fn().mockResolvedValue(undefined),
}));

import {
  listHolidays,
  getHolidayById,
  createHoliday,
  deleteHoliday,
} from '../../src/modules/holidays/holidays.service.js';
import { enqueueJob } from '../../src/shared/queue.service.js';
import { BadRequestError, NotFoundError } from '../../src/utils/errors.js';

const holidayRow = {
  id: 1,
  tenant_id: 't',
  holiday_date: '2030-09-18',
  name: 'Fiestas Patrias',
  notice_days: 15,
  cancel_bookings: true,
  created_by: 9,
  created_at: '2026-01-01',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listHolidays', () => {
  it('maps rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [holidayRow] });
    const rows = await listHolidays('t');
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Fiestas Patrias');
  });
});

describe('getHolidayById', () => {
  it('returns null when missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(getHolidayById(1, 't')).resolves.toBeNull();
  });

  it('returns the holiday', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [holidayRow] });
    const holiday = await getHolidayById(1, 't');
    expect(holiday?.id).toBe(1);
  });
});

describe('createHoliday', () => {
  it('throws when date missing', async () => {
    await expect(createHoliday(9, 't', { holiday_date: '', name: 'x' })).rejects.toThrow(BadRequestError);
  });

  it('throws when name missing', async () => {
    await expect(createHoliday(9, 't', { holiday_date: '2030-09-18', name: '  ' })).rejects.toThrow(BadRequestError);
  });

  it('throws on duplicate date', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    await expect(createHoliday(9, 't', { holiday_date: '2030-09-18', name: 'x' })).rejects.toThrow(BadRequestError);
  });

  it('creates without cancelling bookings', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [holidayRow] });

    const result = await createHoliday(9, 't', { holiday_date: '2030-09-18', name: 'Fiestas Patrias', cancel_bookings: false });

    expect(result.holiday.id).toBe(1);
    expect(result.cancelled_bookings).toBe(0);
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  it('cancels bookings, emails patients and notifies waitlist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [holidayRow] });
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 5, doctor_id: 2, user_id: 3, patient_email: 'p@test.com', patient_name: 'Paciente' }],
    });
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const result = await createHoliday(9, 't', { holiday_date: '2030-09-18', name: 'Fiestas Patrias' });

    expect(result.cancelled_bookings).toBe(1);
    expect(enqueueJob).toHaveBeenCalledWith('email:send', expect.objectContaining({ type: 'booking-cancelled-holiday' }));
  });

  it('cancels bookings without email when patient has none', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [holidayRow] });
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 6, doctor_id: 2, user_id: 3, patient_email: null, patient_name: 'Sin correo' }],
    });
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const result = await createHoliday(9, 't', { holiday_date: '2030-09-18', name: 'Fiestas Patrias' });

    expect(result.cancelled_bookings).toBe(1);
    expect(enqueueJob).not.toHaveBeenCalled();
  });
});

describe('deleteHoliday', () => {
  it('throws when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    await expect(deleteHoliday(1, 't')).rejects.toThrow(NotFoundError);
  });

  it('deletes the holiday', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    await expect(deleteHoliday(1, 't')).resolves.toBeUndefined();
  });
});
