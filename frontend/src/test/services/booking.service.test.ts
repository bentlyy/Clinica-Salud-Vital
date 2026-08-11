import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import { bookingService } from '@/modules/bookings/services/booking.service';

function rawBooking(id = 1, overrides: Record<string, unknown> = {}) {
  return {
    id,
    tenant_id: 1,
    patient_id: 10,
    doctor_id: 5,
    guest_name: null,
    guest_email: null,
    guest_phone: null,
    date: '2026-07-30T10:00:00.000Z',
    time: '10:00:00',
    duration: 30,
    status: 'confirmed',
    notes: null,
    doctor_name: 'Juan Perez',
    patient_name: 'Maria Garcia',
    created_at: '2026-07-25T10:00:00Z',
    updated_at: '2026-07-25T10:00:00Z',
    ...overrides,
  };
}

describe('bookingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMyBookings', () => {
    it('calls GET /bookings/me with params and normalizes rows', async () => {
      apiClient.get.mockResolvedValue({
        data: {
          data: [rawBooking()],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });

      const result = await bookingService.getMyBookings({ page: 1, limit: 10 });

      expect(apiClient.get).toHaveBeenCalledWith('/bookings/me', {
        params: { page: 1, limit: 10 },
        signal: undefined,
      });
      expect(result).toEqual({
        data: [
          expect.objectContaining({
            id: 1,
            date: '2026-07-30',
            time: '10:00',
            status: 'confirmed',
          }),
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('applies the client-side status filter and recomputes totals', async () => {
      apiClient.get.mockResolvedValue({
        data: {
          data: [
            rawBooking(1, { status: 'pending' }),
            rawBooking(2, { status: 'confirmed' }),
            rawBooking(3, { status: 'cancelled' }),
          ],
          total: 3,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });

      const result = await bookingService.getMyBookings({ status: 'confirmed' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(2);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('handles a payload without a data array', async () => {
      apiClient.get.mockResolvedValue({ data: {} });
      const result = await bookingService.getMyBookings();
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getDoctorBookings', () => {
    it('calls GET /bookings/doctor', async () => {
      apiClient.get.mockResolvedValue({ data: { data: [rawBooking()], total: 1 } });
      await bookingService.getDoctorBookings();
      expect(apiClient.get).toHaveBeenCalledWith('/bookings/doctor', {
        params: undefined,
        signal: undefined,
      });
    });
  });

  describe('getAllBookings', () => {
    it('calls GET /bookings/all', async () => {
      apiClient.get.mockResolvedValue({ data: { data: [rawBooking()], total: 1 } });
      await bookingService.getAllBookings();
      expect(apiClient.get).toHaveBeenCalledWith('/bookings/all', {
        params: undefined,
        signal: undefined,
      });
    });
  });

  describe('create', () => {
    it('posts the booking payload and normalizes the response', async () => {
      const input = {
        doctor_id: 5,
        date: '2026-08-01',
        time: '09:00',
        duration: 30,
        notes: 'check',
      };
      apiClient.post.mockResolvedValue({
        data: { ...rawBooking(), date: '2026-08-01T09:00:00Z', time: '09:00:00' },
      });

      const result = await bookingService.create(input);

      expect(apiClient.post).toHaveBeenCalledWith('/bookings', input, undefined);
      expect(result.date).toBe('2026-08-01');
      expect(result.time).toBe('09:00');
    });
  });

  describe('cancel', () => {
    it('patches the cancel endpoint with the reason', async () => {
      apiClient.patch.mockResolvedValue({ data: rawBooking(1, { status: 'cancelled' }) });
      const result = await bookingService.cancel(1, 'motivo');
      expect(apiClient.patch).toHaveBeenCalledWith('/bookings/1/cancel', { reason: 'motivo' }, undefined);
      expect(result.status).toBe('cancelled');
    });

    it('sends an undefined body when no reason is provided', async () => {
      apiClient.patch.mockResolvedValue({ data: rawBooking(1, { status: 'cancelled' }) });
      await bookingService.cancel(1);
      expect(apiClient.patch).toHaveBeenCalledWith('/bookings/1/cancel', undefined, undefined);
    });
  });

  describe('getAvailableSlots', () => {
    it('gets slots with doctor_id/date params and returns the raw array', async () => {
      apiClient.get.mockResolvedValue({ data: ['09:00', '09:30', '10:00'] });
      const result = await bookingService.getAvailableSlots(5, '2026-08-01');
      expect(apiClient.get).toHaveBeenCalledWith('/bookings/available-slots', {
        params: { doctor_id: 5, date: '2026-08-01' },
        signal: undefined,
      });
      expect(result).toEqual(['09:00', '09:30', '10:00']);
    });
  });

  describe('getDailyDensity', () => {
    it('gets daily density with start/end params', async () => {
      apiClient.get.mockResolvedValue({
        data: { data: [{ date: '2026-08-01', count: 3 }] },
      });
      const result = await bookingService.getDailyDensity('2026-08-01', '2026-08-07');
      expect(apiClient.get).toHaveBeenCalledWith('/bookings/doctor/daily-density', {
        params: { start: '2026-08-01', end: '2026-08-07' },
        signal: undefined,
      });
      expect(result.data).toEqual([{ date: '2026-08-01', count: 3 }]);
    });
  });
});
