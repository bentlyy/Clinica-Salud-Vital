import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const reportService = vi.hoisted(() => ({
  getAvailable: vi.fn(),
  generate: vi.fn(),
  getById: vi.fn(),
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('@/modules/reports/services/report.service', () => ({ reportService }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/i18n/i18n', () => ({ default: { t: (key: string) => key, language: 'es' } }));

import {
  useAvailableReports,
  useReportDetail,
  useGenerateReport,
} from '@/modules/reports/hooks/useReports';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const report = {
  id: 1,
  tenant_id: 1,
  type: 'appointments' as const,
  status: 'completed' as const,
  config: { type: 'appointments' as const, date_from: '2026-07-01', date_to: '2026-07-31' },
  created_at: '2026-08-01T10:00:00Z',
};

describe('useReports hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reportService.getAvailable.mockResolvedValue([]);
    reportService.getById.mockResolvedValue(report);
    reportService.generate.mockResolvedValue(report);
  });

  it('useAvailableReports fetches the available report types', async () => {
    reportService.getAvailable.mockResolvedValue([
      { type: 'appointments', label: 'Citas', description: '…', icon: '📅' },
    ]);

    const { result } = renderHook(() => useAvailableReports(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(reportService.getAvailable).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(result.current.data).toHaveLength(1);
  });

  it('useReportDetail is disabled for id <= 0', async () => {
    const { result } = renderHook(() => useReportDetail(0), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(reportService.getById).not.toHaveBeenCalled();
  });

  it('useReportDetail fetches the report for a positive id', async () => {
    const { result } = renderHook(() => useReportDetail(5), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(reportService.getById).toHaveBeenCalledWith(5, { signal: expect.any(AbortSignal) });
    expect(result.current.data?.status).toBe('completed');
  });

  it('useGenerateReport generates a report and shows a success toast', async () => {
    const { result } = renderHook(() => useGenerateReport(), { wrapper: createWrapper() });

    result.current.mutate({
      type: 'appointments',
      date_from: '2026-07-01',
      date_to: '2026-07-31',
    });

    await waitFor(() =>
      expect(reportService.generate).toHaveBeenCalledWith({
        type: 'appointments',
        date_from: '2026-07-01',
        date_to: '2026-07-31',
      }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('reports:reportGenerated'));
  });
});
