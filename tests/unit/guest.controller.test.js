import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/guest/guest.service.js', () => ({
  createGuestBooking: vi.fn(),
  getGuestBookingsByRut: vi.fn(),
  cancelGuestBooking: vi.fn(),
}));

vi.mock('../../src/shared/rut.js', () => ({
  cleanRut: vi.fn((r) => r?.replace(/[.-]/g, '').toUpperCase() || ''),
}));

import * as guestService from '../../src/modules/guest/guest.service.js';
import * as guestController from '../../src/modules/guest/guest.controller.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const mkRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createGuestBooking', () => {
  it('creates booking and returns 201', async () => {
    vi.mocked(guestService.createGuestBooking).mockResolvedValue({ id: 1 });
    const req = { body: { doctor_id: 1, date: '2026-06-01', time: '10:00', rut: '12.345.678-5' }, tenant_id: 't1' };
    const res = mkRes();

    guestController.createGuestBooking(req, res, vi.fn());
    await flush();

    expect(guestService.createGuestBooking).toHaveBeenCalledWith(
      expect.objectContaining({ doctor_id: 1 }),
      't1'
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });
});

describe('getGuestBookingsByRut', () => {
  it('uses string rut param', async () => {
    vi.mocked(guestService.getGuestBookingsByRut).mockResolvedValue([]);
    const req = { params: { rut: '12345678-5' }, tenant_id: 't1' };
    const res = mkRes();

    guestController.getGuestBookingsByRut(req, res, vi.fn());
    await flush();

    expect(guestService.getGuestBookingsByRut).toHaveBeenCalledWith(expect.any(String), 't1');
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('handles array rut param', async () => {
    vi.mocked(guestService.getGuestBookingsByRut).mockResolvedValue([{ id: 1 }]);
    const req = { params: { rut: ['12345678-5', 'extra'] }, tenant_id: 't1' };
    const res = mkRes();

    guestController.getGuestBookingsByRut(req, res, vi.fn());
    await flush();

    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });
});

describe('cancelGuestBooking', () => {
  it('returns 400 when no user and no rut', async () => {
    const req = { params: { id: '1' }, body: {} };
    const res = mkRes();
    const next = vi.fn();

    guestController.cancelGuestBooking(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('cancels booking with rut (guest)', async () => {
    vi.mocked(guestService.cancelGuestBooking).mockResolvedValue({ message: 'Cancelled' });
    const req = { params: { id: '1' }, body: { rut: '12.345.678-5', confirmation_token: 'tok-123' }, tenant_id: 't1' };
    const res = mkRes();

    guestController.cancelGuestBooking(req, res, vi.fn());
    await flush();

    expect(guestService.cancelGuestBooking).toHaveBeenCalledWith(1, '12.345.678-5', undefined, 't1', 'tok-123');
    expect(res.json).toHaveBeenCalledWith({ message: 'Cancelled' });
  });

  it('cancels booking with authenticated user', async () => {
    vi.mocked(guestService.cancelGuestBooking).mockResolvedValue({ message: 'Cancelled' });
    const req = { user: { id: 1, role: 'admin' }, params: { id: '1' }, body: {}, tenant_id: 't1' };
    const res = mkRes();

    guestController.cancelGuestBooking(req, res, vi.fn());
    await flush();

    expect(guestService.cancelGuestBooking).toHaveBeenCalledWith(1, 1, 'admin', 't1');
    expect(res.json).toHaveBeenCalledWith({ message: 'Cancelled' });
  });
});
