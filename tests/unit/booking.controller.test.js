import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/booking/booking.service.js', () => ({
  createBooking: vi.fn(),
  getBookingsByUser: vi.fn(),
  deleteBooking: vi.fn(),
  getAvailableSlots: vi.fn(),
  getBookingsByDoctor: vi.fn(),
}));

vi.mock('../../src/modules/doctor/doctor.service.js', () => ({
  getDoctorByUserId: vi.fn(),
}));

import * as bookingService from '../../src/modules/booking/booking.service.js';
import * as doctorService from '../../src/modules/doctor/doctor.service.js';
import * as bookingController from '../../src/modules/booking/booking.controller.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('bookingController.createBooking', () => {
  it('creates a booking and returns 201', async () => {
    vi.mocked(bookingService.createBooking).mockResolvedValue({ id: 1, date: '2026-06-01', time: '10:00' });
    const req = {
      user: { id: 1 },
      tenant_id: 'test-tenant',
      body: { doctor_id: 1, date: '2026-06-01', time: '10:00', duration: 30 },
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    bookingController.createBooking(req, res, next);
    await flush();

    expect(bookingService.createBooking).toHaveBeenCalledWith({
      doctor_id: 1, date: '2026-06-01', time: '10:00', user_id: 1, duration: 30,
    }, 'test-tenant');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1, date: '2026-06-01', time: '10:00' });
  });
});

describe('bookingController.getMyBookings', () => {
  it('returns paginated bookings', async () => {
    vi.mocked(bookingService.getBookingsByUser).mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    const req = { user: { id: 1 }, tenant_id: 'test', query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    bookingController.getMyBookings(req, res, next);
    await flush();

    expect(bookingService.getBookingsByUser).toHaveBeenCalledWith(1, { page: 1, limit: 20 }, 'test');
    expect(res.json).toHaveBeenCalled();
  });
});

describe('bookingController.cancelBooking', () => {
  it('cancels a booking', async () => {
    vi.mocked(bookingService.deleteBooking).mockResolvedValue({ message: 'Booking cancelled' });
    const req = { user: { id: 1 }, tenant_id: 'test', params: { id: '5' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    bookingController.cancelBooking(req, res, next);
    await flush();

    expect(bookingService.deleteBooking).toHaveBeenCalledWith(5, 1, 'test');
    expect(res.json).toHaveBeenCalledWith({ message: 'Booking cancelled' });
  });
});

describe('bookingController.getDoctorBookings', () => {
  it('returns doctor bookings', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 2 });
    vi.mocked(bookingService.getBookingsByDoctor).mockResolvedValue({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } });
    const req = { user: { id: 1 }, tenant_id: 'test', query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    bookingController.getDoctorBookings(req, res, next);
    await flush();

    expect(doctorService.getDoctorByUserId).toHaveBeenCalledWith(1);
    expect(bookingService.getBookingsByDoctor).toHaveBeenCalledWith(2, { page: 1, limit: 50 }, 'test');
    expect(res.json).toHaveBeenCalled();
  });

  it('calls next with error if doctor not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { user: { id: 1 }, query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    bookingController.getDoctorBookings(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
