import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: vi.fn(),
    on: vi.fn(),
  },
}));

import * as confirmationService from '../../src/modules/confirmation/confirmation.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('confirmationService.confirmBooking', () => {
  it('throws if token invalid', async () => {
    await expect(confirmationService.confirmBooking('invalid-token'))
      .rejects.toThrow();
  });

  it('throws if booking not found', async () => {
    const token = jwt.sign({ user_id: 1, doctor_id: 1, date: '2025-01-15', time: '10:00' }, process.env.JWT_SECRET);
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(confirmationService.confirmBooking(token))
      .rejects.toThrow('Reserva no encontrada');
  });

  it('returns already confirmed if booking was confirmed', async () => {
    const token = jwt.sign({ user_id: 1, doctor_id: 1, date: '2025-01-15', time: '10:00' }, process.env.JWT_SECRET);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, confirmed: true, guest_rut: null }],
    });

    const result = await confirmationService.confirmBooking(token);

    expect(result.alreadyConfirmed).toBe(true);
  });

  it('confirms booking successfully', async () => {
    const token = jwt.sign({ user_id: 1, doctor_id: 1, date: '2025-01-15', time: '10:00' }, process.env.JWT_SECRET);
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, confirmed: false, guest_rut: null }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await confirmationService.confirmBooking(token);

    expect(result.confirmed).toBe(true);
    expect(result.message).toBe('Cita confirmada correctamente');
  });

  it('throws when decoded booking_id does not match', async () => {
    const token = jwt.sign({ booking_id: 999, user_id: 1 }, process.env.JWT_SECRET);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, confirmed: false }],
    });

    await expect(confirmationService.confirmBooking(token))
      .rejects.toThrow('Token inválido para esta reserva');
  });

  it('confirms booking with tenant_id', async () => {
    const token = jwt.sign({ user_id: 1, doctor_id: 1, date: '2025-01-15', time: '10:00' }, process.env.JWT_SECRET);
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, confirmed: false }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await confirmationService.confirmBooking(token, 'tenant-1');

    expect(result.confirmed).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('tenant_id'),
      [expect.any(String), 'tenant-1']
    );
  });
});
