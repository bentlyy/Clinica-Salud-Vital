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
  async getDashboard(): Promise<AdminAnalytics> {
    const [statsRes, monthRes, statusRes, topRes] = await Promise.all([
      apiClient.get<BackendResponse<DashboardStats>>('/analytics/dashboard'),
      apiClient.get<BackendResponse<BookingsByMonth[]>>('/analytics/bookings-by-month'),
      apiClient.get<BackendResponse<BookingsByStatus[]>>('/analytics/status-distribution'),
      apiClient.get<BackendResponse<TopDoctor[]>>('/analytics/top-doctors'),
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

  async getBookingsByMonth(): Promise<BookingsByMonth[]> {
    const { data } = await apiClient.get<BackendResponse<BookingsByMonth[]>>('/analytics/bookings-by-month');
    return data.data;
  },

  async getStatusDistribution(): Promise<BookingsByStatus[]> {
    const { data } = await apiClient.get<BackendResponse<BookingsByStatus[]>>('/analytics/status-distribution');
    return data.data;
  },

  async getTopDoctors(): Promise<TopDoctor[]> {
    const { data } = await apiClient.get<BackendResponse<TopDoctor[]>>('/analytics/top-doctors');
    return data.data;
  },

  async getMyStats(): Promise<DoctorAnalyticsStats> {
    const { data } = await apiClient.get<BackendResponse<DoctorAnalyticsStats>>('/analytics/my-stats');
    return data.data;
  },

  async getNoShows(): Promise<NoShowRecord[]> {
    const { data } = await apiClient.get<BackendResponse<NoShowRecord[]>>('/analytics/no-shows');
    return data.data;
  },

  async getDiagnoses(): Promise<DiagnosisRecord[]> {
    const { data } = await apiClient.get<BackendResponse<DiagnosisRecord[]>>('/analytics/diagnoses');
    return data.data;
  },

  async getDemand(): Promise<DemandRecord[]> {
    const { data } = await apiClient.get<BackendResponse<DemandRecord[]>>('/analytics/demand');
    return data.data;
  },

  async getSchedules(): Promise<ScheduleRecord[]> {
    const { data } = await apiClient.get<BackendResponse<ScheduleRecord[]>>('/analytics/schedules');
    return data.data;
  },

  async getVitals(): Promise<VitalsRecord[]> {
    const { data } = await apiClient.get<BackendResponse<VitalsRecord[]>>('/analytics/vitals');
    return data.data;
  },
};
