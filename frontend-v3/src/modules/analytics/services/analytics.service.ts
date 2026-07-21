import { apiClient } from '@/shared/services/api-client';
import type { AdminAnalytics, DoctorAnalyticsStats } from '../types/analytics.types';

export const analyticsService = {
  async getDashboard(): Promise<AdminAnalytics> {
    const { data } = await apiClient.get<AdminAnalytics>('/analytics/dashboard');
    return data;
  },

  async getBookingsByMonth(): Promise<{ bookings_by_month: AdminAnalytics['bookings_by_month'] }> {
    const { data } = await apiClient.get<{ bookings_by_month: AdminAnalytics['bookings_by_month'] }>('/analytics/bookings-by-month');
    return data;
  },

  async getStatusDistribution(): Promise<{ status_distribution: { status: string; count: number }[] }> {
    const { data } = await apiClient.get('/analytics/status-distribution');
    return data;
  },

  async getTopDoctors(): Promise<{ top_doctors: AdminAnalytics['top_doctors'] }> {
    const { data } = await apiClient.get<{ top_doctors: AdminAnalytics['top_doctors'] }>('/analytics/top-doctors');
    return data;
  },

  async getMyStats(): Promise<DoctorAnalyticsStats> {
    const { data } = await apiClient.get<DoctorAnalyticsStats>('/analytics/my-stats');
    return data;
  },
};
