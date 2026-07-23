import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';

const ANALYTICS_KEYS = {
  all: ['analytics'] as const,
  dashboard: () => [...ANALYTICS_KEYS.all, 'dashboard'] as const,
  bookingsByMonth: () => [...ANALYTICS_KEYS.all, 'bookings-by-month'] as const,
  statusDistribution: () => [...ANALYTICS_KEYS.all, 'status-distribution'] as const,
  topDoctors: () => [...ANALYTICS_KEYS.all, 'top-doctors'] as const,
  myStats: () => [...ANALYTICS_KEYS.all, 'my-stats'] as const,
  noShows: () => [...ANALYTICS_KEYS.all, 'no-shows'] as const,
  diagnoses: () => [...ANALYTICS_KEYS.all, 'diagnoses'] as const,
  demand: () => [...ANALYTICS_KEYS.all, 'demand'] as const,
  schedules: () => [...ANALYTICS_KEYS.all, 'schedules'] as const,
  vitals: () => [...ANALYTICS_KEYS.all, 'vitals'] as const,
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

export function useNoShows() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.noShows(),
    queryFn: analyticsService.getNoShows,
  });
}

export function useDiagnoses() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.diagnoses(),
    queryFn: analyticsService.getDiagnoses,
  });
}

export function useDemand() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.demand(),
    queryFn: analyticsService.getDemand,
  });
}

export function useSchedules() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.schedules(),
    queryFn: analyticsService.getSchedules,
  });
}

export function useVitals() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.vitals(),
    queryFn: analyticsService.getVitals,
  });
}
