import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';

const ANALYTICS_KEYS = {
  all: ['analytics'] as const,
  dashboard: () => [...ANALYTICS_KEYS.all, 'dashboard'] as const,
  bookingsByMonth: () => [...ANALYTICS_KEYS.all, 'bookings-by-month'] as const,
  statusDistribution: () => [...ANALYTICS_KEYS.all, 'status-distribution'] as const,
  topDoctors: () => [...ANALYTICS_KEYS.all, 'top-doctors'] as const,
  myStats: () => [...ANALYTICS_KEYS.all, 'my-stats'] as const,
};

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.dashboard(),
    queryFn: analyticsService.getDashboard,
  });
}

export function useBookingsByMonth() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.bookingsByMonth(),
    queryFn: analyticsService.getBookingsByMonth,
  });
}

export function useStatusDistribution() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.statusDistribution(),
    queryFn: analyticsService.getStatusDistribution,
  });
}

export function useTopDoctors() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.topDoctors(),
    queryFn: analyticsService.getTopDoctors,
  });
}

export function useMyDoctorStats() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.myStats(),
    queryFn: analyticsService.getMyStats,
  });
}
