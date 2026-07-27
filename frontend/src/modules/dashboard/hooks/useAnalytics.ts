import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';

const STALE_TIME = 60_000;

export function useDashboardStats() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: ({ signal }) => analyticsService.getDashboardStats({ signal }),
    staleTime: STALE_TIME,
  });
}

export function useMyDoctorStats() {
  return useQuery({
    queryKey: ['analytics', 'my-stats'],
    queryFn: ({ signal }) => analyticsService.getMyDoctorStats({ signal }),
    staleTime: STALE_TIME,
  });
}

export function useUpcomingBookings() {
  return useQuery({
    queryKey: ['analytics', 'upcoming-bookings'],
    queryFn: ({ signal }) => analyticsService.getUpcomingBookings({ signal }),
    staleTime: STALE_TIME,
  });
}

export function useDoctorUpcomingBookings() {
  return useQuery({
    queryKey: ['analytics', 'doctor-upcoming-bookings'],
    queryFn: ({ signal }) => analyticsService.getDoctorUpcomingBookings({ signal }),
    staleTime: STALE_TIME,
  });
}
