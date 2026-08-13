import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/booking/booking.service.js', () => ({
  createBooking: vi.fn(),
  getBookingsByUser: vi.fn(),
  cancelBooking: vi.fn(),
  rescheduleBooking: vi.fn(),
  confirmBooking: vi.fn(),
  getAvailableSlots: vi.fn(),
  getDailyBookingDensity: vi.fn(),
  getAllBookings: vi.fn(),
  getBookingsByDoctor: vi.fn(),
  createBookingSeries: vi.fn(),
  getBookingSeriesByDoctor: vi.fn(),
  getBookingSeriesByUser: vi.fn(),
  cancelBookingSeries: vi.fn(),
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

    expect(bookingService.getBookingsByUser).toHaveBeenCalledWith(1, { page: 1, limit: 20, status: '' }, 'test');
    expect(res.json).toHaveBeenCalled();
  });

  it('passes status filter to the service', async () => {
    vi.mocked(bookingService.getBookingsByUser).mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    const req = { user: { id: 1 }, tenant_id: 'test', query: { status: 'cancelled' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    bookingController.getMyBookings(req, res, next);
    await flush();

    expect(bookingService.getBookingsByUser).toHaveBeenCalledWith(1, { page: 1, limit: 20, status: 'cancelled' }, 'test');
  });
});

describe('bookingController.cancelBooking', () => {
  it('cancels a booking', async () => {
    vi.mocked(bookingService.cancelBooking).mockResolvedValue({ message: 'Booking cancelled' });
    const req = { user: { id: 1 }, tenant_id: 'test', params: { id: '5' }, body: {} };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    bookingController.cancelBooking(req, res, next);
    await flush();

    expect(bookingService.cancelBooking).toHaveBeenCalledWith(5, 1, 'test', undefined);
    expect(res.json).toHaveBeenCalledWith({ message: 'Booking cancelled' });
  });

  it('passes the cancel reason to the service', async () => {
    vi.mocked(bookingService.cancelBooking).mockResolvedValue({ message: 'Booking cancelled' });
    const req = { user: { id: 1 }, tenant_id: 'test', params: { id: '5' }, body: { reason: 'Enfermo' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    bookingController.cancelBooking(req, res, next);
    await flush();

    expect(bookingService.cancelBooking).toHaveBeenCalledWith(5, 1, 'test', 'Enfermo');
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

    expect(doctorService.getDoctorByUserId).toHaveBeenCalledWith(1, 'test');
    expect(bookingService.getBookingsByDoctor).toHaveBeenCalledWith(2, { page: 1, limit: 50, status: '' }, 'test');
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

describe('bookingController.rescheduleBooking', () => {
  it('reschedules a booking and returns the result', async () => {
    vi.mocked(bookingService.rescheduleBooking).mockResolvedValue({ id: 1, date: '2026-07-01', time: '11:00' });
    const req = {
      user: { id: 1 },
      tenant_id: 'test',
      params: { id: '5' },
      body: { date: '2026-07-01', time: '11:00', duration: 45 },
    };
    const res = { json: vi.fn() };
    const next = vi.fn();

    bookingController.rescheduleBooking(req, res, next);
    await flush();

    expect(bookingService.rescheduleBooking).toHaveBeenCalledWith(
      5, 1, 'test', { date: '2026-07-01', time: '11:00', duration: 45 },
    );
    expect(res.json).toHaveBeenCalledWith({ id: 1, date: '2026-07-01', time: '11:00' });
  });
});

describe('bookingController.confirmBooking', () => {
  it('confirms a booking by token', async () => {
    vi.mocked(bookingService.confirmBooking).mockResolvedValue({ confirmed: true, alreadyConfirmed: false });
    const req = { tenant_id: 'test', params: { token: 'abc123' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    bookingController.confirmBooking(req, res, next);
    await flush();

    expect(bookingService.confirmBooking).toHaveBeenCalledWith('abc123', 'test');
    expect(res.json).toHaveBeenCalledWith({ confirmed: true, alreadyConfirmed: false });
  });
});

describe('bookingController.getDailyDensity', () => {
  const reqBase = { user: { id: 1 }, tenant_id: 'test', query: {} };
  const res = { json: vi.fn() };
  const next = vi.fn();

  it('returns density when doctor and range are present', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 2 });
    vi.mocked(bookingService.getDailyBookingDensity).mockResolvedValue({ density: 0.5 });
    const req = { ...reqBase, query: { start: '2026-06-01', end: '2026-06-30' } };

    bookingController.getDailyDensity(req, res, next);
    await flush();

    expect(bookingService.getDailyBookingDensity).toHaveBeenCalledWith(2, '2026-06-01', '2026-06-30', 'test');
    expect(res.json).toHaveBeenCalledWith({ data: { density: 0.5 } });
  });

  it('throws NotFoundError when doctor profile is missing', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);

    bookingController.getDailyDensity({ ...reqBase, query: { start: 'x', end: 'y' } }, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('throws BadRequestError when start is missing', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 2 });

    bookingController.getDailyDensity({ ...reqBase, query: { end: '2026-06-30' } }, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('throws BadRequestError when end is missing', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 2 });

    bookingController.getDailyDensity({ ...reqBase, query: { start: '2026-06-01' } }, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('throws BadRequestError when both start and end are missing', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 2 });

    bookingController.getDailyDensity({ ...reqBase, query: {} }, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('bookingController.getAllBookingsAdmin', () => {
  it('passes tenant_id for non-superadmin roles', async () => {
    vi.mocked(bookingService.getAllBookings).mockResolvedValue({ data: [], pagination: {} });
    const req = { user: { id: 1, role: 'admin' }, tenant_id: 'test', query: {} };
    const res = { json: vi.fn() };

    bookingController.getAllBookingsAdmin(req, res, vi.fn());
    await flush();

    expect(bookingService.getAllBookings).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 100, status: '', start_date: '', end_date: '' }),
      'test',
    );
    expect(res.json).toHaveBeenCalled();
  });

  it('passes undefined tenant for superadmin', async () => {
    vi.mocked(bookingService.getAllBookings).mockResolvedValue({ data: [], pagination: {} });
    const req = { user: { id: 1, role: 'superadmin' }, tenant_id: 'test', query: {} };
    const res = { json: vi.fn() };

    bookingController.getAllBookingsAdmin(req, res, vi.fn());
    await flush();

    expect(bookingService.getAllBookings).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 100, status: '', start_date: '', end_date: '' }),
      undefined,
    );
  });
});

describe('bookingController.createBookingSeries', () => {
  it('creates a series and returns 201', async () => {
    vi.mocked(bookingService.createBookingSeries).mockResolvedValue({ id: 1, occurrences: 4 });
    const req = {
      user: { id: 1 },
      tenant_id: 'test',
      body: { doctor_id: 1, frequency: 'weekly', interval_count: 1, start_date: '2026-06-01', time: '10:00', duration: 30, occurrences: 4 },
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    bookingController.createBookingSeries(req, res, vi.fn());
    await flush();

    expect(bookingService.createBookingSeries).toHaveBeenCalledWith(expect.objectContaining({
      doctor_id: 1, frequency: 'weekly', interval_count: 1, start_date: '2026-06-01', time: '10:00', duration: 30, occurrences: 4,
    }), 'test');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1, occurrences: 4 });
  });
});

describe('bookingController.getMyBookingSeries', () => {
  it('returns doctor series when role is doctor', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 2 });
    vi.mocked(bookingService.getBookingSeriesByDoctor).mockResolvedValue([{ id: 1 }]);
    const req = { user: { id: 1, role: 'doctor' }, tenant_id: 'test' };
    const res = { json: vi.fn() };

    bookingController.getMyBookingSeries(req, res, vi.fn());
    await flush();

    expect(bookingService.getBookingSeriesByDoctor).toHaveBeenCalledWith(2, 'test');
    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1 }] });
  });

  it('throws NotFoundError when doctor has no profile', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { user: { id: 1, role: 'doctor' }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    bookingController.getMyBookingSeries(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('returns user series for non-doctor roles', async () => {
    vi.mocked(bookingService.getBookingSeriesByUser).mockResolvedValue([{ id: 3 }]);
    const req = { user: { id: 1, role: 'user' }, tenant_id: 'test' };
    const res = { json: vi.fn() };

    bookingController.getMyBookingSeries(req, res, vi.fn());
    await flush();

    expect(bookingService.getBookingSeriesByUser).toHaveBeenCalledWith(1, 'test');
    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 3 }] });
  });
});

describe('bookingController.cancelBookingSeries', () => {
  it('cancels a series', async () => {
    vi.mocked(bookingService.cancelBookingSeries).mockResolvedValue({ message: 'Series cancelled' });
    const req = { user: { id: 1, role: 'user' }, tenant_id: 'test', params: { id: '7' } };
    const res = { json: vi.fn() };

    bookingController.cancelBookingSeries(req, res, vi.fn());
    await flush();

    expect(bookingService.cancelBookingSeries).toHaveBeenCalledWith(7, { user_id: 1, role: 'user' }, 'test');
    expect(res.json).toHaveBeenCalledWith({ message: 'Series cancelled' });
  });
});
