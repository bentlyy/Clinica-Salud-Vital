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

import * as guestService from '../../src/modules/guest/guest.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
  mockSendEmail.mockResolvedValue({ sent: true });
});

describe('guestService.checkRutBlocked', () => {
  it('returns false if user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await guestService.checkRutBlocked('12.345.678-5');

    expect(result).toBe(false);
  });

  it('returns false if blocked_until is null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ blocked_until: null }] });

    const result = await guestService.checkRutBlocked('12.345.678-5');

    expect(result).toBe(false);
  });

  it('returns false if blocked_until is in the past', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    mockQuery.mockResolvedValueOnce({ rows: [{ blocked_until: pastDate }] });

    const result = await guestService.checkRutBlocked('12.345.678-5');

    expect(result).toBe(false);
  });

  it('returns true if blocked_until is in the future', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    mockQuery.mockResolvedValueOnce({ rows: [{ blocked_until: futureDate }] });

    const result = await guestService.checkRutBlocked('12.345.678-5');

    expect(result).toBe(true);
  });
});

describe('guestService.createGuestBooking', () => {
  it('throws if missing required fields', async () => {
    await expect(guestService.createGuestBooking({})).rejects.toThrow('Missing required fields');
    await expect(guestService.createGuestBooking({ doctor_id: 1 })).rejects.toThrow('Missing required fields');
  });

  it('throws if RUT invalid', async () => {
    await expect(guestService.createGuestBooking({
      doctor_id: 1, date: '2025-01-15', time: '10:00', rut: 'invalid', email: 'guest@test.com',
    })).rejects.toThrow('RUT inválido');
  });

  it('throws if date format invalid', async () => {
    await expect(guestService.createGuestBooking({
      doctor_id: 1, date: 'bad', time: '10:00', rut: '12.345.678-5', email: 'guest@test.com',
    })).rejects.toThrow('Formato de fecha inválido');
  });

  it('throws if time format invalid', async () => {
    await expect(guestService.createGuestBooking({
      doctor_id: 1, date: '2025-01-15', time: 'bad', rut: '12.345.678-5', email: 'guest@test.com',
    })).rejects.toThrow('Formato de hora inválido');
  });
});

describe('guestService.getGuestBookingsByRut', () => {
  it('returns bookings for guest rut', async () => {
    const mockBookings = [
      { id: 1, date: '2025-01-15', time: '10:00', doctor_name: 'Dr. Test' },
    ];
    mockQuery.mockResolvedValueOnce({ rows: mockBookings });

    const result = await guestService.getGuestBookingsByRut('12.345.678-5');

    expect(result).toHaveLength(1);
    expect(result[0].doctor_name).toBe('Dr. Test');
  });

  it('returns bookings with tenantId', async () => {
    const mockBookings = [{ id: 1, date: '2025-01-15', time: '10:00', doctor_name: 'Dr. Test' }];
    mockQuery.mockResolvedValueOnce({ rows: mockBookings });

    const result = await guestService.getGuestBookingsByRut('12.345.678-5', 'tenant-1');

    expect(result).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id = $2'), ['123456785', 'tenant-1']);
  });
});

describe('guestService.cancelGuestBooking', () => {
  it('cancels booking as authenticated user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const result = await guestService.cancelGuestBooking(1, 1);

    expect(result.message).toBe('Reserva cancelada correctamente');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('user_id = $2'), [1, 1]);
  });

  it('throws if booking not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(guestService.cancelGuestBooking(999, 1)).rejects.toThrow('Reserva no encontrada');
  });

  it('allows admin to cancel any booking', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const result = await guestService.cancelGuestBooking(1, 1, 'admin');

    expect(result.message).toBe('Reserva cancelada correctamente');
  });

  it('cancels guest booking by rut string', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const result = await guestService.cancelGuestBooking(1, '12.345.678-5');

    expect(result.message).toBe('Reserva cancelada correctamente');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("REPLACE(REPLACE(guest_rut, '.', ''), '-', '') = $2"),
      [1, '123456785']
    );
  });

  it('throws BadRequestError if no auth and no rut', async () => {
    await expect(guestService.cancelGuestBooking(1, undefined)).rejects.toThrow('Debe proporcionar autenticación o RUT para cancelar');
  });

  it('cancels booking with tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const result = await guestService.cancelGuestBooking(1, 1, 'user', 'tenant-1');

    expect(result.message).toBe('Reserva cancelada correctamente');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id = $3'), [1, 1, 'tenant-1']);
  });

  it('admin cancels booking with tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const result = await guestService.cancelGuestBooking(1, 1, 'admin', 'tenant-1');

    expect(result.message).toBe('Reserva cancelada correctamente');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id = $2'), [1, 'tenant-1']);
  });

  it('guest cancels by rut with tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const result = await guestService.cancelGuestBooking(1, '12.345.678-5', undefined, 'tenant-1');

    expect(result.message).toBe('Reserva cancelada correctamente');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id = $3'), [1, '123456785', 'tenant-1']);
  });
});

describe('guestService.createGuestBooking advanced', () => {
  const doctorRow = { id: 1, name: 'Dr. Test', slot_duration: 30 };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockReturnValue(mockClient);
    mockSendEmail.mockResolvedValue({ sent: true });
  });

  it('handles sendEmail returning {sent:false}', async () => {
    mockSendEmail.mockResolvedValue({ sent: false, error: 'SMTP error' });
    mockQuery.mockResolvedValue({ rows: [doctorRow] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM doctor_availability')) return Promise.resolve({ rows: [{ start_time: '09:00:00', end_time: '17:00:00' }] });
      if (sql.includes('FROM doctor_exceptions')) return Promise.resolve({ rows: [] });
      if (sql.includes('FROM bookings')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO bookings')) return Promise.resolve({ rows: [{ id: 2, date: '2026-06-15', time: '10:00' }] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await guestService.createGuestBooking({
      doctor_id: 1, date: '2026-06-15', time: '10:00', rut: '12.345.678-5', email: 'guest@test.com', name: 'Guest',
    });

    expect(result.id).toBe(2);
  });

  it('completes full booking flow with transaction', async () => {
    mockQuery.mockResolvedValue({ rows: [doctorRow] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM doctor_availability')) return Promise.resolve({ rows: [{ start_time: '09:00:00', end_time: '17:00:00' }] });
      if (sql.includes('FROM doctor_exceptions')) return Promise.resolve({ rows: [] });
      if (sql.includes('FROM bookings')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO bookings')) return Promise.resolve({ rows: [{ id: 1, date: '2026-06-15', time: '10:00' }] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await guestService.createGuestBooking({
      doctor_id: 1, date: '2026-06-15', time: '10:00', rut: '12.345.678-5', email: 'guest@test.com', name: 'Guest',
    });

    expect(result.id).toBe(1);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('throws on duplicate slot (unique constraint)', async () => {
    mockQuery.mockResolvedValue({ rows: [doctorRow] });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM doctor_availability')) return Promise.resolve({ rows: [{ start_time: '09:00:00', end_time: '17:00:00' }] });
      if (sql.includes('FROM doctor_exceptions')) return Promise.resolve({ rows: [] });
      if (sql.includes('FROM bookings')) return Promise.resolve({ rows: [] });
      const err = new Error('Duplicate key');
      err.code = '23505';
      if (sql.includes('INSERT INTO bookings')) return Promise.reject(err);
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(guestService.createGuestBooking({
      doctor_id: 1, date: '2026-06-15', time: '10:00', rut: '12.345.678-5', email: 'guest@test.com',
    })).rejects.toThrow('Este horario ya está reservado');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('throws if RUT is blocked', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    mockQuery.mockResolvedValueOnce({ rows: [{ blocked_until: futureDate }] });

    await expect(guestService.createGuestBooking({
      doctor_id: 1, date: '2026-06-15', time: '10:00', rut: '12.345.678-5', email: 'guest@test.com',
    })).rejects.toThrow('bloqueado');
  });

  it('throws if doctor not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ blocked_until: null }] });
    mockConnect.mockReturnValue(mockClient);
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(guestService.createGuestBooking({
      doctor_id: 999, date: '2026-06-15', time: '10:00', rut: '12.345.678-5', email: 'guest@test.com',
    })).rejects.toThrow('Doctor no encontrado');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('throws general error on non-unique DB issue', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ blocked_until: null }] });
    mockConnect.mockReturnValue(mockClient);
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM doctor_availability')) return Promise.resolve({ rows: [{ start_time: '09:00:00', end_time: '17:00:00' }] });
      if (sql.includes('FROM doctor_exceptions')) return Promise.resolve({ rows: [] });
      if (sql.includes('FROM bookings')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO bookings')) return Promise.reject(new Error('Connection timeout'));
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dr. Test', slot_duration: 30 }] });

    await expect(guestService.createGuestBooking({
      doctor_id: 1, date: '2026-06-15', time: '10:00', rut: '12.345.678-5', email: 'guest@test.com',
    })).rejects.toThrow('Connection timeout');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('completes booking flow with tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ blocked_until: null }] });
    mockConnect.mockReturnValue(mockClient);
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      if (sql.includes('FROM doctor_availability')) return Promise.resolve({ rows: [{ start_time: '09:00:00', end_time: '17:00:00' }] });
      if (sql.includes('FROM doctor_exceptions')) return Promise.resolve({ rows: [] });
      if (sql.includes('FROM bookings')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO bookings')) return Promise.resolve({ rows: [{ id: 1, date: '2026-06-15', time: '10:00' }] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dr. Test', slot_duration: 30 }] });

    const result = await guestService.createGuestBooking({
      doctor_id: 1, date: '2026-06-15', time: '10:00', rut: '12.345.678-5', email: 'guest@test.com', name: 'Guest',
    }, 'tenant-1');

    expect(result.id).toBe(1);
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('tenant_id'),
      expect.arrayContaining(['tenant-1'])
    );
  });
});
