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

import * as guestService from '../../src/modules/guest/guest.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
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
});

describe('guestService.cancelGuestBooking', () => {
  it('cancels booking successfully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const result = await guestService.cancelGuestBooking(1, 1);

    expect(result.message).toBe('Reserva cancelada correctamente');
  });

  it('throws if booking not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(guestService.cancelGuestBooking(999, 1)).rejects.toThrow('Reserva no encontrada');
  });
});
