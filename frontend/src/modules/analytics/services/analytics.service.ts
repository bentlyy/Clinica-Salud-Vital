import { apiClient } from '@/shared/services/api-client';
import type {
  AdminAnalytics, DoctorAnalyticsStats, BookingsByMonth, BookingsByStatus,
  TopDoctor, DashboardStats, NoShowRecord, DiagnosisRecord, DemandRecord,
  ScheduleRecord, VitalsRecord,
} from '../types/analytics.types';

interface BackendResponse<T> {
  data: T;
}

export const analyticsService = {
  async getDashboard(opts?: { signal?: AbortSignal }): Promise<AdminAnalytics> {
    const [statsRes, monthRes, statusRes, topRes] = await Promise.all([
      apiClient.get<BackendResponse<DashboardStats>>('/analytics/dashboard', { signal: opts?.signal }),
      apiClient.get<BackendResponse<BookingsByMonth[]>>('/analytics/bookings-by-month', { signal: opts?.signal }),
      apiClient.get<BackendResponse<BookingsByStatus[]>>('/analytics/status-distribution', { signal: opts?.signal }),
      apiClient.get<BackendResponse<TopDoctor[]>>('/analytics/top-doctors', { signal: opts?.signal }),
    ]);

    const topDoctors = topRes.data.data.map((d) => ({
      ...d,
      appointments: d.total_bookings,
    }));

    return {
      stats: statsRes.data.data,
      bookings_by_month: monthRes.data.data,
      bookings_by_status: statusRes.data.data,
      top_doctors: topDoctors,
    };
  },

  async getBookingsByMonth(opts?: { signal?: AbortSignal }): Promise<BookingsByMonth[]> {
    const { data } = await apiClient.get<BackendResponse<BookingsByMonth[]>>('/analytics/bookings-by-month', { signal: opts?.signal });
    return data.data;
  },

  async getStatusDistribution(opts?: { signal?: AbortSignal }): Promise<BookingsByStatus[]> {
    const { data } = await apiClient.get<BackendResponse<BookingsByStatus[]>>('/analytics/status-distribution', { signal: opts?.signal });
    return data.data;
  },

  async getTopDoctors(opts?: { signal?: AbortSignal }): Promise<TopDoctor[]> {
    const { data } = await apiClient.get<BackendResponse<TopDoctor[]>>('/analytics/top-doctors', { signal: opts?.signal });
    return data.data;
  },

  async getMyStats(opts?: { signal?: AbortSignal }): Promise<DoctorAnalyticsStats> {
    const { data } = await apiClient.get<BackendResponse<DoctorAnalyticsStats>>('/analytics/my-stats', { signal: opts?.signal });
    return data.data;
  },

  async getNoShows(opts?: { signal?: AbortSignal }): Promise<NoShowRecord[]> {
    const { data } = await apiClient.get<BackendResponse<NoShowRecord[]>>('/analytics/no-shows', { signal: opts?.signal });
    return data.data;
  },

  async getDiagnoses(opts?: { signal?: AbortSignal }): Promise<DiagnosisRecord[]> {
    const { data } = await apiClient.get<BackendResponse<DiagnosisRecord[]>>('/analytics/diagnoses', { signal: opts?.signal });
    return data.data;
  },

  async getDemand(opts?: { signal?: AbortSignal }): Promise<DemandRecord[]> {
    const { data } = await apiClient.get<BackendResponse<DemandRecord[]>>('/analytics/demand', { signal: opts?.signal });
    return data.data;
  },

  async getSchedules(opts?: { signal?: AbortSignal }): Promise<ScheduleRecord[]> {
    const { data } = await apiClient.get<BackendResponse<ScheduleRecord[]>>('/analytics/schedules', { signal: opts?.signal });
    return data.data;
  },

  async getVitals(opts?: { signal?: AbortSignal }): Promise<VitalsRecord[]> {
    const { data } = await apiClient.get<BackendResponse<VitalsRecord[]>>('/analytics/vitals', { signal: opts?.signal });
    return data.data;
  },
};
