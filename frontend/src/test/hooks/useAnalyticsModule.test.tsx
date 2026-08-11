import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const analyticsService = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  getBookingsByMonth: vi.fn(),
  getStatusDistribution: vi.fn(),
  getTopDoctors: vi.fn(),
  getMyStats: vi.fn(),
  getNoShows: vi.fn(),
  getDiagnoses: vi.fn(),
  getDemand: vi.fn(),
  getSchedules: vi.fn(),
  getVitals: vi.fn(),
}));

vi.mock('@/modules/analytics/services/analytics.service', () => ({ analyticsService }));

import {
  useAdminAnalytics,
  useBookingsByMonth,
  useStatusDistribution,
  useTopDoctors,
  useMyDoctorStats,
  useNoShows,
  useDiagnoses,
  useDemand,
  useSchedules,
  useVitals,
} from '@/modules/analytics/hooks/useAnalytics';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useAnalytics module hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useAdminAnalytics queries the aggregated dashboard', async () => {
    const payload = { stats: {} as never, bookings_by_month: [], bookings_by_status: [], top_doctors: [] };
    analyticsService.getDashboard.mockResolvedValue(payload);
    const { result } = renderHook(() => useAdminAnalytics(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(analyticsService.getDashboard).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(result.current.data).toEqual(payload);
  });

  it('forwards each list query to its endpoint', async () => {
    analyticsService.getBookingsByMonth.mockResolvedValue([]);
    analyticsService.getStatusDistribution.mockResolvedValue([]);
    analyticsService.getTopDoctors.mockResolvedValue([]);
    analyticsService.getNoShows.mockResolvedValue([]);
    analyticsService.getDiagnoses.mockResolvedValue([]);
    analyticsService.getDemand.mockResolvedValue([]);
    analyticsService.getSchedules.mockResolvedValue([]);
    analyticsService.getVitals.mockResolvedValue([]);

    const { result: a } = renderHook(() => useBookingsByMonth(), { wrapper: createWrapper() });
    const { result: b } = renderHook(() => useStatusDistribution(), { wrapper: createWrapper() });
    const { result: c } = renderHook(() => useTopDoctors(), { wrapper: createWrapper() });
    const { result: d } = renderHook(() => useNoShows(), { wrapper: createWrapper() });
    const { result: e } = renderHook(() => useDiagnoses(), { wrapper: createWrapper() });
    const { result: f } = renderHook(() => useDemand(), { wrapper: createWrapper() });
    const { result: g } = renderHook(() => useSchedules(), { wrapper: createWrapper() });
    const { result: h } = renderHook(() => useVitals(), { wrapper: createWrapper() });

    await waitFor(() => expect(a.current.isSuccess).toBe(true));
    await waitFor(() => expect(b.current.isSuccess).toBe(true));
    await waitFor(() => expect(c.current.isSuccess).toBe(true));
    await waitFor(() => expect(d.current.isSuccess).toBe(true));
    await waitFor(() => expect(e.current.isSuccess).toBe(true));
    await waitFor(() => expect(f.current.isSuccess).toBe(true));
    await waitFor(() => expect(g.current.isSuccess).toBe(true));
    await waitFor(() => expect(h.current.isSuccess).toBe(true));

    expect(analyticsService.getBookingsByMonth).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(analyticsService.getStatusDistribution).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(analyticsService.getTopDoctors).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(analyticsService.getNoShows).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(analyticsService.getDiagnoses).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(analyticsService.getDemand).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(analyticsService.getSchedules).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(analyticsService.getVitals).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
  });

  it('useMyDoctorStats queries the doctor stats', async () => {
    const stats = { total_bookings: 5, upcoming_bookings: 2, patients_served: 9, clinical_records: 3 };
    analyticsService.getMyStats.mockResolvedValue(stats);
    const { result } = renderHook(() => useMyDoctorStats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(analyticsService.getMyStats).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(result.current.data?.upcoming_bookings).toBe(2);
  });

  it('exposes the error state when a query fails', async () => {
    analyticsService.getDashboard.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAdminAnalytics(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
