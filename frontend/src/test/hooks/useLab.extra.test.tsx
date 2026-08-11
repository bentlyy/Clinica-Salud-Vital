import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  useMyAreaDashboard,
  useAreaMetrics,
  useMyPending,
  useUrgentRequests,
  useLabRequestDetail,
  useLabRequestItems,
  useUpdateLabRequestStatus,
  useAddLabRequestItem,
  useUpdateLabRequestItem,
  useRemoveLabRequestItem,
  useUpdateResult,
  useValidateTech,
  useValidateDoctor,
  useSignResult,
  useDeliverResult,
  useSamples,
  useSampleDetail,
  useCreateSample,
  useUpdateSample,
  useReceiveSample,
  useVerifySample,
  useRejectSample,
  useResultHistory,
  useQCRecords,
  useCreateQCRecord,
  useApproveQCRecord,
  useLabEquipment,
  useCreateEquipment,
  useUpdateEquipment,
  useLabReagents,
  useCreateReagent,
  useUpdateReagent,
  useLabAreas,
  useLabTests,
  useLabAnalytics,
  useLabNotifications,
  useAcknowledgeNotification,
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

describe('useLab extra query hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useMyAreaDashboard fetches the my-area payload', async () => {
    labService.getMyAreaDashboard.mockResolvedValue({ area: { id: 2 } });
    const { result } = renderLabHook(() => useMyAreaDashboard());
    await waitFor(() => expect(result.current.data).toEqual({ area: { id: 2 } }));
    expect(labService.getMyAreaDashboard).toHaveBeenCalledWith({ signal: expect.anything() });
  });

  it('useAreaMetrics stays disabled when areaId <= 0', async () => {
    const { result } = renderLabHook(() => useAreaMetrics(0));
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(labService.getAreaMetrics).not.toHaveBeenCalled();
  });

  it('useAreaMetrics fetches when areaId > 0', async () => {
    labService.getAreaMetrics.mockResolvedValue({ pending: 1 });
    const { result } = renderLabHook(() => useAreaMetrics(7));
    await waitFor(() => expect(result.current.data).toEqual({ pending: 1 }));
    expect(labService.getAreaMetrics).toHaveBeenCalledWith(7, { signal: expect.anything() });
  });

  it('useMyPending fetches pending requests', async () => {
    labService.getMyPending.mockResolvedValue([{ id: 1 }]);
    const { result } = renderLabHook(() => useMyPending());
    await waitFor(() => expect(result.current.data).toEqual([{ id: 1 }]));
  });

  it('useUrgentRequests fetches urgent requests', async () => {
    labService.getUrgentRequests.mockResolvedValue([{ id: 2, priority: 'urgent' }]);
    const { result } = renderLabHook(() => useUrgentRequests());
    await waitFor(() => expect(result.current.data).toEqual([{ id: 2, priority: 'urgent' }]));
  });

  it('useLabRequestDetail stays disabled when id <= 0', async () => {
    const { result } = renderLabHook(() => useLabRequestDetail(0));
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(labService.getLabRequestById).not.toHaveBeenCalled();
  });

  it('useLabRequestDetail fetches a single request', async () => {
    labService.getLabRequestById.mockResolvedValue({ id: 9, status: 'pending' });
    const { result } = renderLabHook(() => useLabRequestDetail(9));
    await waitFor(() => expect(result.current.data).toEqual({ id: 9, status: 'pending' }));
    expect(labService.getLabRequestById).toHaveBeenCalledWith(9, { signal: expect.anything() });
  });

  it('useLabRequestItems fetches items for a request', async () => {
    labService.getLabRequestItems.mockResolvedValue([{ id: 3 }]);
    const { result } = renderLabHook(() => useLabRequestItems(12));
    await waitFor(() => expect(result.current.data).toEqual([{ id: 3 }]));
    expect(labService.getLabRequestItems).toHaveBeenCalledWith(12, { signal: expect.anything() });
  });

  it('useSamples passes filters to the service', async () => {
    labService.getSamples.mockResolvedValue([{ id: 5 }]);
    const params = { requestId: 12, status: 'received' };
    const { result } = renderLabHook(() => useSamples(params));
    await waitFor(() => expect(result.current.data).toEqual([{ id: 5 }]));
    expect(labService.getSamples).toHaveBeenCalledWith(params, { signal: expect.anything() });
  });

  it('useSampleDetail stays disabled when id <= 0', async () => {
    const { result } = renderLabHook(() => useSampleDetail(0));
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
  });

  it('useSampleDetail fetches a sample by id', async () => {
    labService.getSampleById.mockResolvedValue({ id: 8 });
    const { result } = renderLabHook(() => useSampleDetail(8));
    await waitFor(() => expect(result.current.data).toEqual({ id: 8 }));
  });

  it('useResultHistory stays disabled until both ids are positive', async () => {
    const { result } = renderLabHook(() => useResultHistory(1, 0));
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(labService.getResultHistory).not.toHaveBeenCalled();
  });

  it('useResultHistory fetches history for patient + test', async () => {
    labService.getResultHistory.mockResolvedValue([{ id: 1, delta_percentage: 12 }]);
    const { result } = renderLabHook(() => useResultHistory(50, 12));
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(labService.getResultHistory).toHaveBeenCalledWith(50, 12, { signal: expect.anything() });
  });

  it('useQCRecords passes params to the service', async () => {
    labService.getQCRecords.mockResolvedValue([{ id: 1, status: 'passed' }]);
    const { result } = renderLabHook(() => useQCRecords({ areaId: 2, type: 'internal' }));
    await waitFor(() => expect(result.current.data).toEqual([{ id: 1, status: 'passed' }]));
    expect(labService.getQCRecords).toHaveBeenCalledWith(
      { areaId: 2, type: 'internal' },
      { signal: expect.anything() },
    );
  });

  it('useLabEquipment fetches equipment with params', async () => {
    labService.getEquipment.mockResolvedValue([{ id: 2, status: 'online' }]);
    const { result } = renderLabHook(() => useLabEquipment({ areaId: 1 }));
    await waitFor(() => expect(result.current.data).toEqual([{ id: 2, status: 'online' }]));
  });

  it('useLabReagents fetches reagents with params', async () => {
    labService.getReagents.mockResolvedValue([{ id: 4 }]);
    const { result } = renderLabHook(() => useLabReagents({ areaId: 3 }));
    await waitFor(() => expect(result.current.data).toEqual([{ id: 4 }]));
  });

  it('useLabAreas fetches the area list', async () => {
    labService.getLabAreas.mockResolvedValue([{ id: 1, name: 'Hematología' }]);
    const { result } = renderLabHook(() => useLabAreas());
    await waitFor(() => expect(result.current.data).toEqual([{ id: 1, name: 'Hematología' }]));
  });

  it('useLabTests passes areaId params', async () => {
    labService.getLabTests.mockResolvedValue([{ id: 1, name: 'Hemograma' }]);
    const { result } = renderLabHook(() => useLabTests({ areaId: 2 }));
    await waitFor(() => expect(result.current.data).toEqual([{ id: 1, name: 'Hemograma' }]));
  });

  it('useLabAnalytics passes date range params', async () => {
    labService.getLabAnalytics.mockResolvedValue({ daily: [] });
    const { result } = renderLabHook(() => useLabAnalytics({ dateFrom: '2026-01-01' }));
    await waitFor(() => expect(result.current.data).toEqual({ daily: [] }));
    expect(labService.getLabAnalytics).toHaveBeenCalledWith(
      { dateFrom: '2026-01-01' },
      { signal: expect.anything() },
    );
  });

  it('useLabNotifications fetches the notification list', async () => {
    labService.getLabNotifications.mockResolvedValue([{ id: 1, title: 'Alerta' }]);
    const { result } = renderLabHook(() => useLabNotifications());
    await waitFor(() => expect(result.current.data).toEqual([{ id: 1, title: 'Alerta' }]));
  });
});

describe('useLab extra mutation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useUpdateLabRequestStatus patches the status and toasts', async () => {
    labService.updateLabRequestStatus.mockResolvedValue({ id: 7, status: 'processing' });
    const { result } = renderLabHook(() => useUpdateLabRequestStatus());

    act(() => {
      result.current.mutate({ id: 7, status: 'processing' });
    });

    await waitFor(() =>
      expect(labService.updateLabRequestStatus).toHaveBeenCalledWith(7, 'processing'),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:statusUpdated'));
  });

  it('useAddLabRequestItem posts a new item and toasts', async () => {
    labService.addLabRequestItem.mockResolvedValue({ id: 3 });
    const { result } = renderLabHook(() => useAddLabRequestItem());

    act(() => {
      result.current.mutate({ requestId: 12, input: { lab_test_id: 99 } });
    });

    await waitFor(() =>
      expect(labService.addLabRequestItem).toHaveBeenCalledWith(12, { lab_test_id: 99 }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:itemAdded'));
  });

  it('useUpdateLabRequestItem patches the item and toasts', async () => {
    labService.updateLabRequestItem.mockResolvedValue({ id: 3 });
    const { result } = renderLabHook(() => useUpdateLabRequestItem());

    act(() => {
      result.current.mutate({ requestId: 12, itemId: 3, input: { notes: 'ok' } });
    });

    await waitFor(() =>
      expect(labService.updateLabRequestItem).toHaveBeenCalledWith(12, 3, { notes: 'ok' }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:itemUpdated'));
  });

  it('useRemoveLabRequestItem deletes the item and toasts', async () => {
    labService.removeLabRequestItem.mockResolvedValue(undefined);
    const { result } = renderLabHook(() => useRemoveLabRequestItem());

    act(() => {
      result.current.mutate({ requestId: 12, itemId: 3 });
    });

    await waitFor(() =>
      expect(labService.removeLabRequestItem).toHaveBeenCalledWith(12, 3),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:itemDeleted'));
  });

  it('useUpdateResult patches the result value and toasts', async () => {
    labService.updateResult.mockResolvedValue({ id: 3 });
    const { result } = renderLabHook(() => useUpdateResult());

    act(() => {
      result.current.mutate({
        requestId: 12,
        itemId: 3,
        input: { result_value: '13.0' },
      });
    });

    await waitFor(() =>
      expect(labService.updateResult).toHaveBeenCalledWith(12, 3, { result_value: '13.0' }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:resultUpdated'));
  });

  it('useValidateTech validates an item and toasts success', async () => {
    labService.validateTech.mockResolvedValue({ id: 3, validated_at_tech: 'x' });
    const { result } = renderLabHook(() => useValidateTech());

    act(() => {
      result.current.mutate({ requestId: 12, itemId: 3, notes: 'ok' });
    });

    await waitFor(() =>
      expect(labService.validateTech).toHaveBeenCalledWith(12, 3, { notes: 'ok' }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:validatedByTech'));
  });

  it('useValidateTech toasts error on failure', async () => {
    labService.validateTech.mockRejectedValue(new Error('boom'));
    const { result } = renderLabHook(() => useValidateTech());

    act(() => {
      result.current.mutate({ requestId: 12, itemId: 3 });
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('lab:validationError'));
  });

  it('useValidateDoctor validates an item and toasts success', async () => {
    labService.validateDoctor.mockResolvedValue({ id: 3 });
    const { result } = renderLabHook(() => useValidateDoctor());

    act(() => {
      result.current.mutate({ requestId: 12, itemId: 3 });
    });

    await waitFor(() =>
      expect(labService.validateDoctor).toHaveBeenCalledWith(12, 3, { notes: undefined }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:validatedByDoctor'));
  });

  it('useSignResult signs the result and toasts', async () => {
    labService.signResult.mockResolvedValue({ id: 3, signed_at: 'x' });
    const { result } = renderLabHook(() => useSignResult());

    act(() => {
      result.current.mutate({ requestId: 12, itemId: 3 });
    });

    await waitFor(() => expect(labService.signResult).toHaveBeenCalledWith(12, 3));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:resultSigned'));
  });

  it('useDeliverResult delivers the result and toasts', async () => {
    labService.deliverResult.mockResolvedValue({ id: 3 });
    const { result } = renderLabHook(() => useDeliverResult());

    act(() => {
      result.current.mutate({ requestId: 12, itemId: 3, method: 'print' });
    });

    await waitFor(() =>
      expect(labService.deliverResult).toHaveBeenCalledWith(12, 3, { method: 'print' }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:resultDelivered'));
  });

  it('useCreateSample creates a sample and toasts', async () => {
    labService.createSample.mockResolvedValue({ id: 8 });
    const { result } = renderLabHook(() => useCreateSample());

    act(() => {
      result.current.mutate({ lab_request_item_id: 3, sample_type: 'blood', container_type: 'tube' });
    });

    await waitFor(() =>
      expect(labService.createSample).toHaveBeenCalledWith({
        lab_request_item_id: 3,
        sample_type: 'blood',
        container_type: 'tube',
      }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:sampleCreated'));
  });

  it('useUpdateSample updates a sample and toasts', async () => {
    labService.updateSample.mockResolvedValue({ id: 8 });
    const { result } = renderLabHook(() => useUpdateSample());

    act(() => {
      result.current.mutate({ id: 8, input: { storage_location: 'R1' } });
    });

    await waitFor(() =>
      expect(labService.updateSample).toHaveBeenCalledWith(8, { storage_location: 'R1' }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:sampleUpdated'));
  });

  it('useReceiveSample receives a sample and toasts', async () => {
    labService.receiveSample.mockResolvedValue({ id: 8, status: 'received' });
    const { result } = renderLabHook(() => useReceiveSample());

    act(() => {
      result.current.mutate(8);
    });

    await waitFor(() => expect(labService.receiveSample).toHaveBeenCalledWith(8));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:sampleReceived'));
  });

  it('useVerifySample verifies a sample and toasts', async () => {
    labService.verifySample.mockResolvedValue({ id: 8 });
    const { result } = renderLabHook(() => useVerifySample());

    act(() => {
      result.current.mutate(8);
    });

    await waitFor(() => expect(labService.verifySample).toHaveBeenCalledWith(8));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:sampleVerified'));
  });

  it('useRejectSample rejects a sample with reason and toasts', async () => {
    labService.rejectSample.mockResolvedValue({ id: 8 });
    const { result } = renderLabHook(() => useRejectSample());

    act(() => {
      result.current.mutate({ id: 8, reason: 'hemolizada' });
    });

    await waitFor(() => expect(labService.rejectSample).toHaveBeenCalledWith(8, 'hemolizada'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:sampleRejected'));
  });

  it('useCreateQCRecord creates a QC record and toasts', async () => {
    labService.createQCRecord.mockResolvedValue({ id: 1 });
    const { result } = renderLabHook(() => useCreateQCRecord());

    act(() => {
      result.current.mutate({ control_name: 'C1' });
    });

    await waitFor(() =>
      expect(labService.createQCRecord).toHaveBeenCalledWith({ control_name: 'C1' }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:qcCreated'));
  });

  it('useApproveQCRecord approves a QC record and toasts', async () => {
    labService.approveQCRecord.mockResolvedValue({ id: 1, status: 'passed' });
    const { result } = renderLabHook(() => useApproveQCRecord());

    act(() => {
      result.current.mutate(1);
    });

    await waitFor(() => expect(labService.approveQCRecord).toHaveBeenCalledWith(1));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:qcApproved'));
  });

  it('useCreateEquipment registers equipment and toasts', async () => {
    labService.createEquipment.mockResolvedValue({ id: 2 });
    const { result } = renderLabHook(() => useCreateEquipment());

    act(() => {
      result.current.mutate({ name: 'Analyzer' });
    });

    await waitFor(() =>
      expect(labService.createEquipment).toHaveBeenCalledWith({ name: 'Analyzer' }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:equipmentRegistered'));
  });

  it('useUpdateEquipment updates equipment and toasts', async () => {
    labService.updateEquipment.mockResolvedValue({ id: 2 });
    const { result } = renderLabHook(() => useUpdateEquipment());

    act(() => {
      result.current.mutate({ id: 2, input: { status: 'maintenance' } });
    });

    await waitFor(() =>
      expect(labService.updateEquipment).toHaveBeenCalledWith(2, { status: 'maintenance' }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:equipmentUpdated'));
  });

  it('useCreateReagent registers a reagent and toasts', async () => {
    labService.createReagent.mockResolvedValue({ id: 4 });
    const { result } = renderLabHook(() => useCreateReagent());

    act(() => {
      result.current.mutate({ name: 'Reactivo' });
    });

    await waitFor(() =>
      expect(labService.createReagent).toHaveBeenCalledWith({ name: 'Reactivo' }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:reagentRegistered'));
  });

  it('useUpdateReagent updates a reagent and toasts', async () => {
    labService.updateReagent.mockResolvedValue({ id: 4 });
    const { result } = renderLabHook(() => useUpdateReagent());

    act(() => {
      result.current.mutate({ id: 4, input: { current_stock: 10 } });
    });

    await waitFor(() =>
      expect(labService.updateReagent).toHaveBeenCalledWith(4, { current_stock: 10 }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('lab:reagentUpdated'));
  });

  it('useAcknowledgeNotification posts the id without a toast', async () => {
    labService.acknowledgeNotification.mockResolvedValue({ id: 4, acknowledged: true });
    const { result } = renderLabHook(() => useAcknowledgeNotification());

    act(() => {
      result.current.mutate(4);
    });

    await waitFor(() =>
      expect(labService.acknowledgeNotification).toHaveBeenCalledWith(4),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });
});
