import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import { analyticsService } from '@/modules/dashboard/services/analytics.service';

function mockGet(data: unknown) {
  apiClient.get.mockResolvedValue({ data });
}

const today = new Date().toISOString().split('T')[0];

describe('analyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('calls GET /analytics/dashboard and returns the inner payload', async () => {
      const stats = {
        total_patients: 10,
        total_doctors: 3,
        total_bookings: 42,
        today_bookings: 5,
        confirmed_bookings: 20,
        cancelled_bookings: 2,
      };
      mockGet({ data: stats });

      await expect(analyticsService.getDashboardStats()).resolves.toEqual(stats);
      expect(apiClient.get).toHaveBeenCalledWith('/analytics/dashboard', {
        signal: undefined,
      });
    });

    it('forwards the abort signal', async () => {
      mockGet({ data: {} });
      const signal = new AbortController().signal;
      await analyticsService.getDashboardStats({ signal });
      expect(apiClient.get).toHaveBeenCalledWith('/analytics/dashboard', { signal });
    });
  });

  describe('getMyDoctorStats', () => {
    it('calls GET /analytics/my-stats and returns the stats object', async () => {
      const stats = {
        total_bookings: 8,
        upcoming_bookings: 3,
        patients_served: 12,
        clinical_records: 4,
      };
      mockGet({ data: stats });

      await expect(analyticsService.getMyDoctorStats()).resolves.toEqual(stats);
      expect(apiClient.get).toHaveBeenCalledWith('/analytics/my-stats', {
        signal: undefined,
      });
    });
  });

  describe('getUpcomingBookings', () => {
    it('calls GET /bookings/all with page/limit params', async () => {
      mockGet({ data: [] });
      await analyticsService.getUpcomingBookings();
      expect(apiClient.get).toHaveBeenCalledWith('/bookings/all', {
        params: { page: 1, limit: 10 },
        signal: undefined,
      });
    });

    it('normalizes dates, times and values, filtering out past bookings', async () => {
      mockGet({
        data: [
          {
            id: '1',
            date: '2020-01-01T10:00:00.000Z',
            time: '10:00:00',
            duration: '45',
            status: 'confirmed',
            doctor_name: 'Juan Perez',
            patient_name: 'Maria',
            guest_name: null,
          },
          {
            id: 2,
            date: `${today}T09:30:00.000Z`,
            time: '09:30',
            duration: 30,
            status: 'pending',
            doctor_name: 'Ana Torres',
            patient_name: null,
            guest_name: 'Pedro',
          },
          {
            id: 3,
            date: `${today}T11:00:00.000Z`,
            time: '11:00',
            duration: 60,
            status: 'cancelled',
            doctor_name: '',
            patient_name: 'Luis',
            guest_name: null,
          },
        ],
      });

      const result = await analyticsService.getUpcomingBookings();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 2,
        date: today,
        time: '09:30',
        duration: 30,
        status: 'pending',
        doctor_name: 'Ana Torres',
        patient_name: null,
        guest_name: 'Pedro',
      });
      expect(result[1]).toEqual({
        id: 3,
        date: today,
        time: '11:00',
        duration: 60,
        status: 'cancelled',
        doctor_name: '',
        patient_name: 'Luis',
        guest_name: null,
      });
    });

    it('limits the result to 5 entries and falls back duration to 30', async () => {
      const rows = Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        date: today,
        time: '10:00',
        duration: undefined,
        status: 'pending',
        doctor_name: 'Dr X',
        patient_name: 'P',
        guest_name: null,
      }));
      mockGet({ data: rows });

      const result = await analyticsService.getUpcomingBookings();
      expect(result).toHaveLength(5);
      expect(result[0].duration).toBe(30);
    });

    it('handles a missing/empty data payload', async () => {
      mockGet({});
      await expect(analyticsService.getUpcomingBookings()).resolves.toEqual([]);
    });
  });

  describe('getDoctorUpcomingBookings', () => {
    it('calls GET /bookings/doctor with page/limit params', async () => {
      mockGet({ data: [], total: 0 });
      await analyticsService.getDoctorUpcomingBookings();
      expect(apiClient.get).toHaveBeenCalledWith('/bookings/doctor', {
        params: { page: 1, limit: 50 },
        signal: undefined,
      });
    });

    it('normalizes rows and sets doctor_name to empty string', async () => {
      mockGet({
        data: [
          {
            id: 9,
            date: `${today}T15:00:00.000Z`,
            time: '15:00:00',
            duration: '20',
            status: 'completed',
            patient_name: 'Carla',
            guest_name: null,
          },
          {
            id: 10,
            date: '2020-05-05',
            time: '08:00',
            duration: 30,
            status: 'pending',
            patient_name: null,
            guest_name: 'Invitado',
          },
        ],
        total: 2,
      });

      const result = await analyticsService.getDoctorUpcomingBookings();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 9,
        date: today,
        time: '15:00',
        duration: 20,
        status: 'completed',
        doctor_name: '',
        patient_name: 'Carla',
        guest_name: null,
      });
    });

    it('guards against a non-array data payload', async () => {
      mockGet({ data: null, total: 0 });
      await expect(analyticsService.getDoctorUpcomingBookings()).resolves.toEqual([]);
    });
  });
});
