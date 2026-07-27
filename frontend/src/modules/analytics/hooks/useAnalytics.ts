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
    queryFn: ({ signal }) => analyticsService.getDashboard({ signal }),
  });
}

export function useBookingsByMonth() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.bookingsByMonth(),
    queryFn: ({ signal }) => analyticsService.getBookingsByMonth({ signal }),
  });
}

export function useStatusDistribution() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.statusDistribution(),
    queryFn: ({ signal }) => analyticsService.getStatusDistribution({ signal }),
  });
}

export function useTopDoctors() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.topDoctors(),
    queryFn: ({ signal }) => analyticsService.getTopDoctors({ signal }),
  });
}

export function useMyDoctorStats() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.myStats(),
    queryFn: ({ signal }) => analyticsService.getMyStats({ signal }),
  });
}

export function useNoShows() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.noShows(),
    queryFn: ({ signal }) => analyticsService.getNoShows({ signal }),
  });
}

export function useDiagnoses() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.diagnoses(),
    queryFn: ({ signal }) => analyticsService.getDiagnoses({ signal }),
  });
}

export function useDemand() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.demand(),
    queryFn: ({ signal }) => analyticsService.getDemand({ signal }),
  });
}

export function useSchedules() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.schedules(),
    queryFn: ({ signal }) => analyticsService.getSchedules({ signal }),
  });
}

export function useVitals() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.vitals(),
    queryFn: ({ signal }) => analyticsService.getVitals({ signal }),
  });
}
