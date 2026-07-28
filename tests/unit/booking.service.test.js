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

const mockSendEmail = vi.hoisted(() => vi.fn());
vi.mock('../../src/shared/email.service.js', () => ({
  sendEmail: mockSendEmail,
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
  mockSendEmail.mockResolvedValue({ sent: true });
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

  it('returns bookings for user with tenant_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const result = await bookingService.getBookingsByUser(1, { page: 1, limit: 20 }, 'tenant-1');

    expect(result.data).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('tenant_id'),
      [1, 20, 0, 'tenant-1']
    );
  });
});

describe('bookingService.cancelBooking', () => {
  it('cancels booking successfully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const result = await bookingService.cancelBooking(1, 1);

    expect(result.message).toBe('Booking cancelled successfully');
  });

  it('throws if booking not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(bookingService.cancelBooking(999, 1)).rejects.toThrow('Booking not found or unauthorized');
  });

  it('throws if id is not integer', async () => {
    await expect(bookingService.cancelBooking('abc', 1)).rejects.toThrow('Invalid booking id');
  });

  it('throws if user_id is not integer', async () => {
    await expect(bookingService.cancelBooking(1, 'abc')).rejects.toThrow('Invalid booking id');
  });

  it('cancels booking with tenant_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const result = await bookingService.cancelBooking(1, 1, 'tenant-1');

    expect(result.message).toBe('Booking cancelled successfully');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('tenant_id'),
      [1, 1, 'tenant-1']
    );
  });
});

describe('bookingService.getAvailableSlots', () => {
  it('throws if missing params', async () => {
    await expect(bookingService.getAvailableSlots()).rejects.toThrow('Missing required fields');
    await expect(bookingService.getAvailableSlots(1)).rejects.toThrow('Missing required fields');
  });

  it('throws if date format invalid', async () => {
    await expect(bookingService.getAvailableSlots(1, 'bad-date')).rejects.toThrow('Invalid date format');
  });

  it('returns empty if no availability', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await bookingService.getAvailableSlots(1, futureDate);

    expect(result).toEqual([]);
  });

  it('returns available slots', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ start_time: '09:00:00', end_time: '12:00:00' }] })
      .mockResolvedValueOnce({ rows: [{ slot_duration: 30 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await bookingService.getAvailableSlots(1, futureDate);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toBe('09:00');
  });

  it('uses default slot_duration 30 when doctor has null duration', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ start_time: '09:00:00', end_time: '10:00:00' }] })
      .mockResolvedValueOnce({ rows: [{ slot_duration: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await bookingService.getAvailableSlots(1, futureDate);

    expect(result).toContain('09:00');
    expect(result).toContain('09:30');
  });

  it('filters out booked and exception slots', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ start_time: '09:00:00', end_time: '12:00:00' }] })
      .mockResolvedValueOnce({ rows: [{ slot_duration: 60 }] })
      .mockResolvedValueOnce({ rows: [{ time: '10:00', duration: 60 }] })
      .mockResolvedValueOnce({ rows: [{ is_full_day: false, start_time: '11:00', end_time: '12:00' }] });

    const result = await bookingService.getAvailableSlots(1, futureDate);

    expect(result).toContain('09:00');
    expect(result).not.toContain('10:00');
    expect(result).not.toContain('11:00');
  });

  it('blocks full day exception in getAvailableSlots', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ start_time: '09:00:00', end_time: '12:00:00' }] })
      .mockResolvedValueOnce({ rows: [{ slot_duration: 30 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ is_full_day: true }] });

    const result = await bookingService.getAvailableSlots(1, futureDate);

    expect(result).toEqual([]);
  });

  it('returns slots with tenant_id', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ start_time: '09:00:00', end_time: '12:00:00' }] })
      .mockResolvedValueOnce({ rows: [{ slot_duration: 30 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await bookingService.getAvailableSlots(1, futureDate, 'tenant-1');

    expect(result.length).toBeGreaterThan(0);
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('tenant_id'),
      [1, expect.any(Number), 'tenant-1']
    );
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

  it('returns bookings for doctor with tenant_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const result = await bookingService.getBookingsByDoctor(1, { page: 1, limit: 50 }, 'tenant-1');

    expect(result.data).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('tenant_id'),
      [1, 50, 0, 'tenant-1']
    );
  });
});

describe('bookingService.getAllBookings', () => {
  it('returns paginated bookings', async () => {
    const mockBookings = [
      { id: 1, date: '2025-01-15', time: '10:00', doctor_name: 'Dr. Test' },
    ];
    mockQuery.mockResolvedValueOnce({ rows: mockBookings });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const result = await bookingService.getAllBookings({ page: 1, limit: 50 });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('returns paginated bookings with tenant_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, date: '2025-01-15' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const result = await bookingService.getAllBookings({ page: 1, limit: 10 }, 'tenant-1');

    expect(result.data).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('tenant_id'),
      [10, 0, 'tenant-1']
    );
  });
});

describe('bookingService.createBooking advanced', () => {
  const doctorRow = { id: 1, name: 'Dr. Test', slot_duration: 30, specialty: 'General', email: 'doc@test.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockReturnValue(mockClient);
  });

  it('throws if date is in the past', async () => {
    await expect(bookingService.createBooking({
      doctor_id: 1, user_id: 1, date: '2020-01-01', time: '10:00',
    })).rejects.toThrow('Cannot book appointments in the past');
  });

  it('throws if outside doctor availability', async () => {
    mockQuery.mockResolvedValue({ rows: [doctorRow] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM users WHERE id')) return Promise.resolve({ rows: [{ email: 'test@test.com', blocked_until: null }] });
      if (sql.includes('FROM doctor_availability')) return Promise.resolve({ rows: [{ start_time: '09:00:00', end_time: '12:00:00' }] });
      return Promise.resolve({ rows: [] });
    });

    await expect(bookingService.createBooking({
      doctor_id: 1, user_id: 1, date: futureDate, time: '14:00',
    })).rejects.toThrow('Outside doctor availability');
  });

  it('detects time slot overlap', async () => {
    mockQuery.mockResolvedValue({ rows: [doctorRow] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM users WHERE id')) return Promise.resolve({ rows: [{ email: 'test@test.com', blocked_until: null }] });
      if (sql.includes('FROM doctor_availability')) return Promise.resolve({ rows: [{ start_time: '09:00:00', end_time: '17:00:00' }] });
      if (sql.includes('FROM doctor_exceptions')) return Promise.resolve({ rows: [] });
      if (sql.includes('FROM bookings')) return Promise.resolve({ rows: [{ id: 1 }] });
      return Promise.resolve({ rows: [] });
    });

    await expect(bookingService.createBooking({
      doctor_id: 1, user_id: 1, date: futureDate, time: '10:00',
    })).rejects.toThrow('This time slot is already booked');
  });

  it('blocks full day exception', async () => {
    mockQuery.mockResolvedValue({ rows: [doctorRow] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM users WHERE id')) return Promise.resolve({ rows: [{ email: 'test@test.com', blocked_until: null }] });
      if (sql.includes('FROM doctor_availability')) return Promise.resolve({ rows: [{ start_time: '09:00:00', end_time: '17:00:00' }] });
      if (sql.includes('FROM doctor_exceptions')) return Promise.resolve({ rows: [{ id: 1, is_full_day: true }] });
      return Promise.resolve({ rows: [] });
    });

    await expect(bookingService.createBooking({
      doctor_id: 1, user_id: 1, date: futureDate, time: '10:00',
    })).rejects.toThrow('full day blocked');
  });

  it('handles sendEmail returning {sent:false}', async () => {
    mockSendEmail.mockResolvedValue({ sent: false, error: 'SMTP error' });
    mockQuery.mockResolvedValue({ rows: [doctorRow] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM users WHERE id')) return Promise.resolve({ rows: [{ email: 'test@test.com', blocked_until: null, rut: null, phone: null }] });
      if (sql.includes('FROM doctor_availability')) return Promise.resolve({ rows: [{ start_time: '09:00:00', end_time: '17:00:00' }] });
      if (sql.includes('FROM doctor_exceptions')) return Promise.resolve({ rows: [] });
      if (sql.includes('FROM bookings')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO bookings')) return Promise.resolve({ rows: [{ id: 3, date: futureDate, time: '10:00' }] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await bookingService.createBooking({
      doctor_id: 1, user_id: 1, date: futureDate, time: '10:00',
    });

    expect(result.id).toBe(3);
    await new Promise(r => setTimeout(r, 5));
  });

  it('handles email sending throw in booking catch block', async () => {
    mockSendEmail.mockRejectedValue(new Error('SMTP connection failed'));
    mockQuery.mockResolvedValue({ rows: [doctorRow] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM users WHERE id')) return Promise.resolve({ rows: [{ email: 'test@test.com', blocked_until: null, rut: null, phone: null }] });
      if (sql.includes('FROM doctor_availability')) return Promise.resolve({ rows: [{ start_time: '09:00:00', end_time: '17:00:00' }] });
      if (sql.includes('FROM doctor_exceptions')) return Promise.resolve({ rows: [] });
      if (sql.includes('FROM bookings')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO bookings')) return Promise.resolve({ rows: [{ id: 1, date: futureDate, time: '10:00' }] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await bookingService.createBooking({
      doctor_id: 1, user_id: 1, date: futureDate, time: '10:00',
    });

    expect(result.id).toBe(1);
    await new Promise(r => setTimeout(r, 5));
  });

  it('creates booking successfully through full flow', async () => {
    mockQuery.mockResolvedValue({ rows: [doctorRow] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM users WHERE id')) return Promise.resolve({ rows: [{ email: 'test@test.com', blocked_until: null, rut: null, phone: null }] });
      if (sql.includes('FROM doctor_availability')) return Promise.resolve({ rows: [{ start_time: '09:00:00', end_time: '17:00:00' }] });
      if (sql.includes('FROM doctor_exceptions')) return Promise.resolve({ rows: [] });
      if (sql.includes('FROM bookings')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO bookings')) return Promise.resolve({ rows: [{ id: 1, date: futureDate, time: '10:00' }] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await bookingService.createBooking({
      doctor_id: 1, user_id: 1, date: futureDate, time: '10:00',
    });

    expect(result.id).toBe(1);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('throws when duration exceeds slot_duration', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Dr. Test', slot_duration: 30, specialty: 'General' }] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM users WHERE id')) return Promise.resolve({ rows: [{ email: 'test@test.com', blocked_until: null }] });
      return Promise.resolve({ rows: [] });
    });

    await expect(bookingService.createBooking({
      doctor_id: 1, user_id: 1, date: futureDate, time: '10:00', duration: 60,
    })).rejects.toThrow('Duration cannot exceed');
  });

  it('throws on PG unique violation (23505)', async () => {
    mockQuery.mockResolvedValue({ rows: [doctorRow] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM users WHERE id')) return Promise.resolve({ rows: [{ email: 'test@test.com', blocked_until: null }] });
      if (sql.includes('FROM doctor_availability')) return Promise.resolve({ rows: [{ start_time: '09:00:00', end_time: '17:00:00' }] });
      if (sql.includes('FROM doctor_exceptions')) return Promise.resolve({ rows: [] });
      if (sql.includes('FROM bookings')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO bookings')) {
        const err = new Error('duplicate key');
        err.code = '23505';
        return Promise.reject(err);
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(bookingService.createBooking({
      doctor_id: 1, user_id: 1, date: futureDate, time: '10:00',
    })).rejects.toThrow('This time slot is already booked');
  });

  it('throws on PG foreign key violation (23503)', async () => {
    mockQuery.mockResolvedValue({ rows: [doctorRow] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM users WHERE id')) return Promise.resolve({ rows: [{ email: 'test@test.com', blocked_until: null }] });
      if (sql.includes('FROM doctor_availability')) return Promise.resolve({ rows: [{ start_time: '09:00:00', end_time: '17:00:00' }] });
      if (sql.includes('FROM doctor_exceptions')) return Promise.resolve({ rows: [] });
      if (sql.includes('FROM bookings')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO bookings')) {
        const err = new Error('foreign key');
        err.code = '23503';
        return Promise.reject(err);
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(bookingService.createBooking({
      doctor_id: 1, user_id: 1, date: futureDate, time: '10:00',
    })).rejects.toThrow('Invalid doctor or user');
  });

  it('creates booking with tenant_id', async () => {
    mockQuery.mockResolvedValue({ rows: [doctorRow] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM users WHERE id')) return Promise.resolve({ rows: [{ email: 'test@test.com', blocked_until: null, rut: null, phone: null }] });
      if (sql.includes('FROM doctor_availability')) return Promise.resolve({ rows: [{ start_time: '09:00:00', end_time: '17:00:00' }] });
      if (sql.includes('FROM doctor_exceptions')) return Promise.resolve({ rows: [] });
      if (sql.includes('FROM bookings')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO bookings')) return Promise.resolve({ rows: [{ id: 1 }] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await bookingService.createBooking({
      doctor_id: 1, user_id: 1, date: futureDate, time: '10:00',
    }, 'tenant-1');

    expect(result.id).toBe(1);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });
});
