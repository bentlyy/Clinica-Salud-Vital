import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const bookingService = vi.hoisted(() => ({
  getMyBookings: vi.fn(),
  getDoctorBookings: vi.fn(),
  getAllBookings: vi.fn(),
  create: vi.fn(),
  cancel: vi.fn(),
  getAvailableSlots: vi.fn(),
  getDailyDensity: vi.fn(),
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('@/modules/bookings/services/booking.service', () => ({ bookingService }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/i18n/i18n', () => ({ default: { t: (key: string) => key, language: 'es' } }));

import {
  useMyBookings,
  useDoctorBookings,
  useAllBookings,
  useCreateBooking,
  useCancelBooking,
  useAvailableSlots,
  useDailyDensity,
} from '@/modules/bookings/hooks/useBookings';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const paginated = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };

describe('useBookings hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingService.getMyBookings.mockResolvedValue(paginated);
    bookingService.getDoctorBookings.mockResolvedValue(paginated);
    bookingService.getAllBookings.mockResolvedValue(paginated);
    bookingService.create.mockResolvedValue({ id: 1 });
    bookingService.cancel.mockResolvedValue({ id: 1 });
    bookingService.getAvailableSlots.mockResolvedValue(['09:00']);
    bookingService.getDailyDensity.mockResolvedValue({ data: [] });
  });

  it('useMyBookings fetches my bookings when params are provided', async () => {
    const { result } = renderHook(() => useMyBookings({ page: 1, limit: 20 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(bookingService.getMyBookings).toHaveBeenCalledWith(
      { page: 1, limit: 20 },
      { signal: expect.any(AbortSignal) },
    );
  });

  it('useMyBookings is disabled without params', async () => {
    const { result } = renderHook(() => useMyBookings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(bookingService.getMyBookings).not.toHaveBeenCalled();
  });

  it('useDoctorBookings fetches doctor bookings', async () => {
    const { result } = renderHook(() => useDoctorBookings({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(bookingService.getDoctorBookings).toHaveBeenCalledWith(
      { page: 1 },
      { signal: expect.any(AbortSignal) },
    );
  });

  it('useAllBookings fetches all bookings', async () => {
    const { result } = renderHook(() => useAllBookings({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(bookingService.getAllBookings).toHaveBeenCalledWith(
      { page: 1 },
      { signal: expect.any(AbortSignal) },
    );
  });

  it('useAvailableSlots is disabled until doctor and date are provided', async () => {
    const { result, rerender } = renderHook(
      ({ doctorId, date }: { doctorId: number | null; date: string | null }) =>
        useAvailableSlots(doctorId, date),
      { initialProps: { doctorId: null, date: null }, wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(bookingService.getAvailableSlots).not.toHaveBeenCalled();

    rerender({ doctorId: 5, date: '2026-08-01' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(bookingService.getAvailableSlots).toHaveBeenCalledWith(
      5,
      '2026-08-01',
      { signal: expect.any(AbortSignal) },
    );
  });

  it('useDailyDensity fetches the daily density for a range', async () => {
    const { result } = renderHook(() => useDailyDensity('2026-08-01', '2026-08-07'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(bookingService.getDailyDensity).toHaveBeenCalledWith(
      '2026-08-01',
      '2026-08-07',
      { signal: expect.any(AbortSignal) },
    );
  });

  it('useCreateBooking creates a booking and shows a success toast', async () => {
    const { result } = renderHook(() => useCreateBooking(), { wrapper: createWrapper() });

    result.current.mutate({
      doctor_id: 5,
      date: '2026-08-01',
      time: '09:00',
      duration: 30,
    });

    await waitFor(() => expect(bookingService.create).toHaveBeenCalled());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('bookings:created'));
  });

  it('useCreateBooking shows an error toast on failure', async () => {
    bookingService.create.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useCreateBooking(), { wrapper: createWrapper() });

    result.current.mutate({ doctor_id: 5, date: '2026-08-01', time: '09:00' });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('bookings:createError'));
  });

  it('useCancelBooking cancels a booking with a reason and shows a success toast', async () => {
    const { result } = renderHook(() => useCancelBooking(), { wrapper: createWrapper() });

    result.current.mutate({ id: 7, reason: 'cambio de horario' });

    await waitFor(() =>
      expect(bookingService.cancel).toHaveBeenCalledWith(7, 'cambio de horario'),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('bookings:cancelled'));
  });

  it('useCancelBooking shows an error toast on failure', async () => {
    bookingService.cancel.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useCancelBooking(), { wrapper: createWrapper() });

    result.current.mutate({ id: 7 });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('bookings:cancelError'));
  });
});
