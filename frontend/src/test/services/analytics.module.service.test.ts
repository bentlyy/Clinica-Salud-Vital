import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiClient = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import { analyticsService } from '@/modules/analytics/services/analytics.service';
import type {
  AdminAnalytics,
  DoctorAnalyticsStats,
  BookingsByMonth,
  BookingsByStatus,
  TopDoctor,
  NoShowRecord,
  DiagnosisRecord,
  DemandRecord,
  ScheduleRecord,
  VitalsRecord,
} from '@/modules/analytics/types/analytics.types';

function mockGet(payload: unknown) {
  apiClient.get.mockResolvedValue({ data: { data: payload } });
}

describe('analytics module service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getDashboard aggregates the four endpoints and maps appointments', async () => {
    const stats = { total_patients: 10, total_doctors: 3, total_bookings: 42, today_bookings: 5, confirmed_bookings: 20, cancelled_bookings: 2 };
    const byMonth: BookingsByMonth[] = [{ month: '2026-01', total: 10, confirmed: 8, cancelled: 1 }];
    const byStatus: BookingsByStatus[] = [{ status: 'confirmed', count: 8 }];
    const top: TopDoctor[] = [{ id: 1, name: 'Dra. Ana', specialty: 'Cardiología', total_bookings: 12, confirmed_bookings: 9, appointments: 0 }];

    apiClient.get
      .mockResolvedValueOnce({ data: { data: stats } })
      .mockResolvedValueOnce({ data: { data: byMonth } })
      .mockResolvedValueOnce({ data: { data: byStatus } })
      .mockResolvedValueOnce({ data: { data: top } });

    const result = await analyticsService.getDashboard({ signal: new AbortController().signal });

    expect(apiClient.get).toHaveBeenCalledTimes(4);
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/dashboard', { signal: expect.any(AbortSignal) });
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/bookings-by-month', { signal: expect.any(AbortSignal) });
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/status-distribution', { signal: expect.any(AbortSignal) });
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/top-doctors', { signal: expect.any(AbortSignal) });
    expect(result).toEqual<AdminAnalytics>({
      stats,
      bookings_by_month: byMonth,
      bookings_by_status: byStatus,
      top_doctors: [{ id: 1, name: 'Dra. Ana', specialty: 'Cardiología', total_bookings: 12, confirmed_bookings: 9, appointments: 12 }],
    });
  });

  it.each<[string, keyof typeof analyticsService, string]>([
    ['getBookingsByMonth', 'getBookingsByMonth', '/analytics/bookings-by-month'],
    ['getStatusDistribution', 'getStatusDistribution', '/analytics/status-distribution'],
    ['getTopDoctors', 'getTopDoctors', '/analytics/top-doctors'],
    ['getNoShows', 'getNoShows', '/analytics/no-shows'],
    ['getDiagnoses', 'getDiagnoses', '/analytics/diagnoses'],
    ['getDemand', 'getDemand', '/analytics/demand'],
    ['getSchedules', 'getSchedules', '/analytics/schedules'],
    ['getVitals', 'getVitals', '/analytics/vitals'],
  ])('%s unwraps the data array', async (_, method, url) => {
    mockGet([{ id: 1 }]);
    const result = await (analyticsService[method] as (opts?: { signal?: AbortSignal }) => Promise<unknown>)({ signal: new AbortController().signal });
    expect(result).toEqual([{ id: 1 }]);
    expect(apiClient.get).toHaveBeenCalledWith(url, { signal: expect.any(AbortSignal) });
  });

  it('getMyStats unwraps the doctor stats object', async () => {
    const stats: DoctorAnalyticsStats = { total_bookings: 5, upcoming_bookings: 2, patients_served: 9, clinical_records: 3 };
    mockGet(stats);
    await expect(analyticsService.getMyStats({})).resolves.toEqual(stats);
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/my-stats', { signal: undefined });
  });

  it('preserves the shapes of every record type', async () => {
    const noShows: NoShowRecord[] = [{ doctor: 'Dr. Luis', total: 10, noShows: 2 }];
    const diagnoses: DiagnosisRecord[] = [{ diagnosis: 'Hipertensión', count: 5, cie10: 'I10' }];
    const demand: DemandRecord[] = [{ date: '2026-01-01', bookings: 8, predicted: 10 }];
    const schedules: ScheduleRecord[] = [{ day: 'Lunes', bestTime: '09:00', occupancy: 75, hours: [{ time: '09:00', score: 80 }] }];
    const vitals: VitalsRecord[] = [{ patientId: 'P1', date: '2026-01-01', pressure: '120/80', heartRate: 70, temperature: 36.5, anomaly: false }];

    apiClient.get
      .mockResolvedValueOnce({ data: { data: noShows } })
      .mockResolvedValueOnce({ data: { data: diagnoses } })
      .mockResolvedValueOnce({ data: { data: demand } })
      .mockResolvedValueOnce({ data: { data: schedules } })
      .mockResolvedValueOnce({ data: { data: vitals } });

    await expect(analyticsService.getNoShows()).resolves.toEqual(noShows);
    await expect(analyticsService.getDiagnoses()).resolves.toEqual(diagnoses);
    await expect(analyticsService.getDemand()).resolves.toEqual(demand);
    await expect(analyticsService.getSchedules()).resolves.toEqual(schedules);
    await expect(analyticsService.getVitals()).resolves.toEqual(vitals);
  });
});
