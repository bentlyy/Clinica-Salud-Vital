import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';

const labService = vi.hoisted(() => ({
  getLabDashboard: vi.fn(),
  getAreaDashboard: vi.fn(),
  getMyAreaDashboard: vi.fn(),
  getAreaMetrics: vi.fn(),
  getMyPending: vi.fn(),
  getUrgentRequests: vi.fn(),
  getLabRequests: vi.fn(),
  getLabRequestById: vi.fn(),
  createLabRequest: vi.fn(),
  updateLabRequest: vi.fn(),
  deleteLabRequest: vi.fn(),
  cancelLabRequest: vi.fn(),
  updateLabRequestStatus: vi.fn(),
  getLabRequestItems: vi.fn(),
  addLabRequestItem: vi.fn(),
  updateLabRequestItem: vi.fn(),
  removeLabRequestItem: vi.fn(),
  enterResult: vi.fn(),
  updateResult: vi.fn(),
  validateTech: vi.fn(),
  validateDoctor: vi.fn(),
  signResult: vi.fn(),
  deliverResult: vi.fn(),
  getSamples: vi.fn(),
  getSampleById: vi.fn(),
  createSample: vi.fn(),
  updateSample: vi.fn(),
  receiveSample: vi.fn(),
  verifySample: vi.fn(),
  rejectSample: vi.fn(),
  getResultHistory: vi.fn(),
  getQCRecords: vi.fn(),
  createQCRecord: vi.fn(),
  updateQCRecord: vi.fn(),
  approveQCRecord: vi.fn(),
  getEquipment: vi.fn(),
  createEquipment: vi.fn(),
  updateEquipment: vi.fn(),
  getReagents: vi.fn(),
  createReagent: vi.fn(),
  updateReagent: vi.fn(),
  getLabAreas: vi.fn(),
  getLabTests: vi.fn(),
  getLabAnalytics: vi.fn(),
  getLabAnalyticsByDoctor: vi.fn(),
  getLabNotifications: vi.fn(),
  acknowledgeNotification: vi.fn(),
  acknowledgeAllNotifications: vi.fn(),
  subscribeToLabSSE: vi.fn(),
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const i18nMock = vi.hoisted(() => ({ t: (key: string) => key }));

vi.mock('@/modules/laboratory/services/lab.service', () => labService);
vi.mock('@/i18n/i18n', () => ({ default: i18nMock }));
vi.mock('react-hot-toast', () => ({ default: toast }));

import {
  useLabDashboard,
  useAreaDashboard,
  useLabRequests,
  useCreateLabRequest,
  useDeleteLabRequest,
  useUpdateLabRequest,
  useCancelLabRequest,
  useAcknowledgeAllNotifications,
  useLabFilters,
  useLabSSE,
  useEnterResult,
} from '@/modules/laboratory/hooks/useLab';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderLabHook<T>(callback: () => T) {
  const queryClient = makeQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const utils = renderHook(callback, { wrapper });
  return { ...utils, queryClient };
}

describe('useLab query hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useLabDashboard fetches dashboard metrics', async () => {
    labService.getLabDashboard.mockResolvedValue({ pending: 5, urgent: 2 });

    const { result } = renderLabHook(() => useLabDashboard());

    await waitFor(() => expect(result.current.data).toEqual({ pending: 5, urgent: 2 }));
    expect(labService.getLabDashboard).toHaveBeenCalledWith({ signal: expect.anything() });
  });

  it('useAreaDashboard stays disabled when areaId <= 0', async () => {
    const { result } = renderLabHook(() => useAreaDashboard(0));
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(labService.getAreaDashboard).not.toHaveBeenCalled();
  });

  it('useAreaDashboard fetches when areaId > 0', async () => {
    labService.getAreaDashboard.mockResolvedValue({ area: { id: 3 } });
    const { result } = renderLabHook(() => useAreaDashboard(3));

    await waitFor(() => expect(result.current.data).toEqual({ area: { id: 3 } }));
    expect(labService.getAreaDashboard).toHaveBeenCalledWith(3, { signal: expect.anything() });
  });

  it('useLabRequests passes params to the service', async () => {
    labService.getLabRequests.mockResolvedValue({ data: [{ id: 1 }], total: 1 });
    const params = { page: 1, limit: 25, status: 'pending' as const };

    const { result } = renderLabHook(() => useLabRequests(params));

    await waitFor(() => expect(result.current.data).toEqual({ data: [{ id: 1 }], total: 1 }));
    expect(labService.getLabRequests).toHaveBeenCalledWith(params, { signal: expect.anything() });
  });
});

describe('useLab mutation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useCreateLabRequest calls service, invalidates queries and toasts success', async () => {
    labService.createLabRequest.mockResolvedValue({ id: 10 });
    const { result, queryClient } = renderLabHook(() => useCreateLabRequest());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    act(() => {
      result.current.mutate({ patient_id: 1 });
    });

    await waitFor(() => expect(labService.createLabRequest).toHaveBeenCalledWith({ patient_id: 1 }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:requestCreated'));
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('useCreateLabRequest toasts error on failure', async () => {
    labService.createLabRequest.mockRejectedValue(new Error('boom'));
    const { result } = renderLabHook(() => useCreateLabRequest());

    act(() => {
      result.current.mutate({ patient_id: 1 });
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('lab:requestCreateError'));
  });

  it('useDeleteLabRequest deletes by id and toasts success', async () => {
    labService.deleteLabRequest.mockResolvedValue(undefined);
    const { result } = renderLabHook(() => useDeleteLabRequest());

    act(() => {
      result.current.mutate(42);
    });

    await waitFor(() => expect(labService.deleteLabRequest).toHaveBeenCalledWith(42));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:requestDeleted'));
  });

  it('useUpdateLabRequest sends id + input to the service', async () => {
    labService.updateLabRequest.mockResolvedValue({ id: 7 });
    const { result } = renderLabHook(() => useUpdateLabRequest());

    act(() => {
      result.current.mutate({ id: 7, input: { notes: 'ok' } });
    });

    await waitFor(() =>
      expect(labService.updateLabRequest).toHaveBeenCalledWith(7, { notes: 'ok' }),
    );
  });

  it('useCancelLabRequest sends id and reason', async () => {
    labService.cancelLabRequest.mockResolvedValue({ id: 7, status: 'cancelled' });
    const { result } = renderLabHook(() => useCancelLabRequest());

    act(() => {
      result.current.mutate({ id: 7, reason: 'sin muestra' });
    });

    await waitFor(() =>
      expect(labService.cancelLabRequest).toHaveBeenCalledWith(7, 'sin muestra'),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:requestCancelled'));
  });

  it('useAcknowledgeAllNotifications toasts success after resolving', async () => {
    labService.acknowledgeAllNotifications.mockResolvedValue(undefined);
    const { result } = renderLabHook(() => useAcknowledgeAllNotifications());

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(labService.acknowledgeAllNotifications).toHaveBeenCalled());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:notificationsRead'));
  });

  it('useEnterResult sends result input to the service', async () => {
    labService.enterResult.mockResolvedValue({ id: 3, result_value: '12.5' });
    const { result } = renderLabHook(() => useEnterResult());

    act(() => {
      result.current.mutate({
        requestId: 9,
        itemId: 3,
        input: { result_value: '12.5', unit: 'mg/dL' },
      });
    });

    await waitFor(() =>
      expect(labService.enterResult).toHaveBeenCalledWith(
        9,
        3,
        { result_value: '12.5', unit: 'mg/dL' },
      ),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:resultRegistered'));
  });
});

describe('useLabFilters', () => {
  it('starts with the default filter state', () => {
    const { result } = renderLabHook(() => useLabFilters());
    expect(result.current.filters).toMatchObject({
      status: '',
      search: '',
      dateFrom: '',
      dateTo: '',
      isCritical: false,
      isRepeated: false,
      onlyUrgent: false,
    });
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('updateFilter changes a single key and reports active filters', () => {
    const { result } = renderLabHook(() => useLabFilters());

    act(() => {
      result.current.updateFilter('status', 'pending');
    });

    expect(result.current.filters.status).toBe('pending');
    expect(result.current.filters.search).toBe('');
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('search text counts as an active filter', () => {
    const { result } = renderLabHook(() => useLabFilters());

    act(() => {
      result.current.updateFilter('search', 'ana');
    });

    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('resetFilters restores defaults', () => {
    const { result } = renderLabHook(() => useLabFilters());

    act(() => {
      result.current.updateFilter('status', 'processing');
      result.current.updateFilter('dateFrom', '2026-01-01');
      result.current.resetFilters();
    });

    expect(result.current.filters.status).toBe('');
    expect(result.current.filters.dateFrom).toBe('');
    expect(result.current.hasActiveFilters).toBe(false);
  });
});

describe('useLabSSE', () => {
  let onMessageCallback: ((event: MessageEvent) => void) | null = null;
  let closeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onMessageCallback = null;
    closeMock = vi.fn();
    labService.subscribeToLabSSE.mockImplementation(
      (onMessage: (event: MessageEvent) => void) => {
        onMessageCallback = onMessage;
        return { close: closeMock, onmessage: onMessage } as unknown as EventSource;
      },
    );
  });

  it('subscribes and reports connected state', async () => {
    const { result } = renderLabHook(() => useLabSSE());

    await waitFor(() => expect(labService.subscribeToLabSSE).toHaveBeenCalled());
    expect(result.current.isConnected).toBe(true);
  });

  it('accumulates events and clears them on clearEvents', async () => {
    const { result } = renderLabHook(() => useLabSSE());

    await waitFor(() => expect(labService.subscribeToLabSSE).toHaveBeenCalled());

    act(() => {
      onMessageCallback?.({ type: 'message', data: '{"type":"critical_result","payload":{"id":1}}' } as MessageEvent);
    });

    expect(result.current.events).toHaveLength(1);
    // useLabSSE uses the native event type and passes data through raw
    expect(result.current.events[0].type).toBe('message');
    expect(result.current.events[0].payload).toContain('critical_result');

    act(() => {
      result.current.clearEvents();
    });
    expect(result.current.events).toHaveLength(0);
  });

  it('closes the event source on unmount', async () => {
    const { unmount } = renderLabHook(() => useLabSSE());
    await waitFor(() => expect(labService.subscribeToLabSSE).toHaveBeenCalled());

    unmount();
    expect(closeMock).toHaveBeenCalled();
    // effect cleanup sets isConnected to false after unmount
  });
});
