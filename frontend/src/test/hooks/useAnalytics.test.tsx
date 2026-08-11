import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const analyticsService = vi.hoisted(() => ({
  getDashboardStats: vi.fn(),
  getMyDoctorStats: vi.fn(),
  getUpcomingBookings: vi.fn(),
  getDoctorUpcomingBookings: vi.fn(),
}));

vi.mock('@/modules/dashboard/services/analytics.service', () => ({ analyticsService }));

import {
  useDashboardStats,
  useMyDoctorStats,
  useUpcomingBookings,
  useDoctorUpcomingBookings,
} from '@/modules/dashboard/hooks/useAnalytics';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useAnalytics hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useDashboardStats queries the dashboard stats endpoint', async () => {
    analyticsService.getDashboardStats.mockResolvedValue({
      total_patients: 1,
      total_doctors: 1,
      total_bookings: 1,
      today_bookings: 1,
      confirmed_bookings: 1,
      cancelled_bookings: 0,
    });

    const { result } = renderHook(() => useDashboardStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(analyticsService.getDashboardStats).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
    });
    expect(result.current.data?.total_patients).toBe(1);
  });

  it('useMyDoctorStats queries the my-stats endpoint', async () => {
    analyticsService.getMyDoctorStats.mockResolvedValue({
      total_bookings: 5,
      upcoming_bookings: 2,
      patients_served: 9,
      clinical_records: 3,
    });

    const { result } = renderHook(() => useMyDoctorStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(analyticsService.getMyDoctorStats).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
    });
    expect(result.current.data?.upcoming_bookings).toBe(2);
  });

  it('useUpcomingBookings queries the upcoming bookings endpoint', async () => {
    analyticsService.getUpcomingBookings.mockResolvedValue([]);

    const { result } = renderHook(() => useUpcomingBookings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(analyticsService.getUpcomingBookings).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
    });
    expect(result.current.data).toEqual([]);
  });

  it('useDoctorUpcomingBookings queries the doctor upcoming bookings endpoint', async () => {
    analyticsService.getDoctorUpcomingBookings.mockResolvedValue([]);

    const { result } = renderHook(() => useDoctorUpcomingBookings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(analyticsService.getDoctorUpcomingBookings).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
    });
  });

  it('exposes the error state when a query fails', async () => {
    analyticsService.getDashboardStats.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useDashboardStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
