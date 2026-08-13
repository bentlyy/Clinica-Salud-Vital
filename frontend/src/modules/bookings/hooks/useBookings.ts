import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '../services/booking.service';
import type { BookingListParams, CreateBookingInput, CreateBookingSeriesInput } from '../types/booking.types';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';

export const bookingKeys = {
  all: ['bookings'] as const,
  myBookings: (params?: BookingListParams) => ['bookings', 'me', params] as const,
  doctorBookings: (params?: BookingListParams) => ['bookings', 'doctor', params] as const,
  allBookings: (params?: BookingListParams) => ['bookings', 'all', params] as const,
  availableSlots: (doctorId: number, date: string) =>
    ['bookings', 'available-slots', doctorId, date] as const,
  dailyDensity: (start: string, end: string) =>
    ['bookings', 'daily-density', start, end] as const,
  mySeries: () => ['bookings', 'series'] as const,
};

const STALE_TIME = 30_000;

export function useMyBookings(params?: BookingListParams) {
  return useQuery({
    queryKey: bookingKeys.myBookings(params),
    queryFn: ({ signal }) => bookingService.getMyBookings(params, { signal }),
    staleTime: STALE_TIME,
    enabled: !!params,
    placeholderData: (prev) => prev,
  });
}

export function useDoctorBookings(params?: BookingListParams) {
  return useQuery({
    queryKey: bookingKeys.doctorBookings(params),
    queryFn: ({ signal }) => bookingService.getDoctorBookings(params, { signal }),
    staleTime: STALE_TIME,
    enabled: !!params,
    placeholderData: (prev) => prev,
  });
}

export function useAllBookings(params?: BookingListParams) {
  return useQuery({
    queryKey: bookingKeys.allBookings(params),
    queryFn: ({ signal }) => bookingService.getAllBookings(params, { signal }),
    staleTime: STALE_TIME,
    enabled: !!params,
    placeholderData: (prev) => prev,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookingInput) => bookingService.create(data),
    onSuccess: () => {
      toast.success(i18n.t('bookings:created'));
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
    onError: () => {
      toast.error(i18n.t('bookings:createError'));
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => bookingService.cancel(id, reason),
    onSuccess: () => {
      toast.success(i18n.t('bookings:cancelled'));
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
    onError: () => {
      toast.error(i18n.t('bookings:cancelError'));
    },
  });
}

export function useRescheduleBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, date, time, duration }: { id: number; date: string; time: string; duration?: number }) =>
      bookingService.reschedule(id, { date, time, duration }),
    onSuccess: () => {
      toast.success(i18n.t('bookings:rescheduled'));
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
    onError: () => {
      toast.error(i18n.t('bookings:rescheduleError'));
    },
  });
}

export function useAvailableSlots(doctorId: number | null, date: string | null) {
  return useQuery({
    queryKey: bookingKeys.availableSlots(doctorId ?? 0, date ?? ''),
    queryFn: ({ signal }) => bookingService.getAvailableSlots(doctorId!, date!, { signal }),
    enabled: !!doctorId && !!date,
    staleTime: STALE_TIME,
  });
}

export function useDailyDensity(start: string, end: string) {
  return useQuery({
    queryKey: bookingKeys.dailyDensity(start, end),
    queryFn: ({ signal }) => bookingService.getDailyDensity(start, end, { signal }),
    staleTime: STALE_TIME,
  });
}

export function useCreateBookingSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookingSeriesInput) => bookingService.createSeries(data),
    onSuccess: () => {
      toast.success(i18n.t('bookings:seriesCreated'));
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      void queryClient.invalidateQueries({ queryKey: bookingKeys.mySeries() });
    },
    onError: () => {
      toast.error(i18n.t('bookings:createError'));
    },
  });
}

export function useMyBookingSeries() {
  return useQuery({
    queryKey: bookingKeys.mySeries(),
    queryFn: ({ signal }) => bookingService.getMySeries({ signal }),
    staleTime: STALE_TIME,
  });
}

export function useCancelBookingSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => bookingService.cancelSeries(id),
    onSuccess: () => {
      toast.success(i18n.t('bookings:seriesCancelled'));
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      void queryClient.invalidateQueries({ queryKey: bookingKeys.mySeries() });
    },
    onError: () => {
      toast.error(i18n.t('bookings:cancelError'));
    },
  });
}
