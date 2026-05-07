import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockClient, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockClient: { query: vi.fn(), release: vi.fn() },
  mockConnect: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: mockConnect,
    on: vi.fn(),
  },
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail: vi.fn().mockResolvedValue({}) }),
  },
}));

import * as bookingService from '../../src/modules/booking/booking.service.js';

const futureDate = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
})();

const futureMonday = (() => {
  const d = new Date();
  const dayOfWeek = d.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toISOString().split('T')[0];
})();

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
});

describe('bookingService.createBooking', () => {
  it('throws if missing required fields', async () => {
    await expect(bookingService.createBooking({})).rejects.toThrow('Missing required fields');
  });

  it('throws if date format invalid', async () => {
    await expect(bookingService.createBooking({
      doctor_id: 1, user_id: 1, date: 'invalid', time: '10:00',
    })).rejects.toThrow('Invalid date format');
  });

  it('throws if time format invalid', async () => {
    await expect(bookingService.createBooking({
      doctor_id: 1, user_id: 1, date: futureDate, time: 'invalid',
    })).rejects.toThrow('Invalid time format');
  });

  it('throws if duration out of range', async () => {
    await expect(bookingService.createBooking({
      doctor_id: 1, user_id: 1, date: futureDate, time: '10:00', duration: 0,
    })).rejects.toThrow('Duration must be between 1 and 480');
  });

  it('throws if doctor not found', async () => {
    mockClient.query.mockImplementation(() => Promise.resolve({ rows: [] }));
    mockQuery.mockResolvedValue({ rows: [] });

    await expect(bookingService.createBooking({
      doctor_id: 999, user_id: 1, date: futureDate, time: '10:00',
    })).rejects.toThrow('Doctor not found');
  });

  it('throws if user not found', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Dr. Test', specialty: 'General' }] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM users WHERE id')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await expect(bookingService.createBooking({
      doctor_id: 1, user_id: 999, date: futureDate, time: '10:00',
    })).rejects.toThrow('User not found');
  });

  it('throws if user account is blocked', async () => {
    const futureBlockDate = new Date(Date.now() + 86400000).toISOString();
    mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Dr. Test', specialty: 'General' }] });

    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM users WHERE id')) {
        return Promise.resolve({ rows: [{ email: 'test@test.com', blocked_until: futureBlockDate }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(bookingService.createBooking({
      doctor_id: 1, user_id: 1, date: futureDate, time: '10:00',
    })).rejects.toThrow('blocked');
  });

  it('throws if doctor not available on that day', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Dr. Test', specialty: 'General' }] });

    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM users WHERE id')) {
        return Promise.resolve({ rows: [{ email: 'test@test.com', blocked_until: null }] });
      }
      if (sql.includes('FROM doctor_availability')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(bookingService.createBooking({
      doctor_id: 1, user_id: 1, date: futureMonday, time: '10:00',
    })).rejects.toThrow('Doctor not available on this day');
  });
});

describe('bookingService.getBookingsByUser', () => {
  it('returns bookings for user', async () => {
    const mockBookings = [
      { id: 1, date: '2025-01-15', time: '10:00', doctor_name: 'Dr. Test' },
    ];
    mockQuery.mockResolvedValueOnce({ rows: mockBookings });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const result = await bookingService.getBookingsByUser(1);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].doctor_name).toBe('Dr. Test');
  });
});

describe('bookingService.deleteBooking', () => {
  it('cancels booking successfully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const result = await bookingService.deleteBooking(1, 1);

    expect(result.message).toBe('Booking cancelled successfully');
  });

  it('throws if booking not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(bookingService.deleteBooking(999, 1)).rejects.toThrow('Booking not found or unauthorized');
  });

  it('throws if id is not integer', async () => {
    await expect(bookingService.deleteBooking('abc', 1)).rejects.toThrow('Invalid booking id');
  });
});

describe('bookingService.getAvailableSlots', () => {
  it('throws if missing params', async () => {
    await expect(bookingService.getAvailableSlots()).rejects.toThrow('doctor_id and date are required');
    await expect(bookingService.getAvailableSlots(1)).rejects.toThrow('doctor_id and date are required');
  });

  it('throws if date format invalid', async () => {
    await expect(bookingService.getAvailableSlots(1, 'bad-date')).rejects.toThrow('Invalid date format');
  });

  it('returns empty if no availability', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await bookingService.getAvailableSlots(1, futureDate);

    expect(result).toEqual([]);
  });

  it('returns available slots', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ start_time: '09:00:00', end_time: '12:00:00' }] })
      .mockResolvedValueOnce({ rows: [{ slot_duration: 30 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await bookingService.getAvailableSlots(1, futureDate);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toBe('09:00');
  });
});

describe('bookingService.getBookingsByDoctor', () => {
  it('returns bookings for doctor', async () => {
    const mockBookings = [
      { id: 1, date: '2025-01-15', time: '10:00', patient_email: 'patient@test.com' },
    ];
    mockQuery.mockResolvedValueOnce({ rows: mockBookings });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const result = await bookingService.getBookingsByDoctor(1);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].patient_email).toBe('patient@test.com');
  });
});
