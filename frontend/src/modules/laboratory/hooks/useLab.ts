import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';
import * as labService from '../services/lab.service';
import type {
  LabRequestListParams,
  LabFilterState,
  CreateLabRequestInput,
} from '../types/lab.types';
import { DEFAULT_FILTER_STATE } from '../types/lab.types';

// ── Query Keys ───────────────────────────────────────────────────────────────

export const labKeys = {
  all: ['laboratory'] as const,
  dashboard: () => [...labKeys.all, 'dashboard'] as const,
  areaDashboard: (areaId: number) => [...labKeys.all, 'area-daily', areaId] as const,
  myArea: () => [...labKeys.all, 'my-area'] as const,
  areaMetrics: (areaId: number) => [...labKeys.all, 'area-metrics', areaId] as const,
  myPending: () => [...labKeys.all, 'my-pending'] as const,
  urgent: () => [...labKeys.all, 'urgent'] as const,
  requests: (params?: LabRequestListParams) => [...labKeys.all, 'requests', params] as const,
  requestDetail: (id: number) => [...labKeys.all, 'requests', id] as const,
  items: (requestId: number) => [...labKeys.all, 'requests', requestId, 'items'] as const,
  samples: (params?: Record<string, unknown>) => [...labKeys.all, 'samples', params] as const,
  sampleDetail: (id: number) => [...labKeys.all, 'samples', id] as const,
  resultHistory: (patientId: number, testId: number) =>
    [...labKeys.all, 'result-history', patientId, testId] as const,
  qcRecords: (params?: Record<string, unknown>) => [...labKeys.all, 'qc-records', params] as const,
  equipment: (params?: { areaId?: number }) => [...labKeys.all, 'equipment', params] as const,
  reagents: (params?: { areaId?: number }) => [...labKeys.all, 'reagents', params] as const,
  areas: () => [...labKeys.all, 'areas'] as const,
  tests: (params?: { areaId?: number }) => [...labKeys.all, 'tests', params] as const,
  analytics: (params?: Record<string, unknown>) => [...labKeys.all, 'analytics', params] as const,
  notifications: () => [...labKeys.all, 'notifications'] as const,
};

const STALE_TIME = 30_000;

// ── Dashboard ────────────────────────────────────────────────────────────────

export function useLabDashboard() {
  return useQuery({
    queryKey: labKeys.dashboard(),
    queryFn: ({ signal }) => labService.getLabDashboard({ signal }),
    staleTime: STALE_TIME,
  });
}

export function useAreaDashboard(areaId: number) {
  return useQuery({
    queryKey: labKeys.areaDashboard(areaId),
    queryFn: ({ signal }) => labService.getAreaDashboard(areaId, { signal }),
    enabled: areaId > 0,
    staleTime: STALE_TIME,
  });
}

export function useMyAreaDashboard() {
  return useQuery({
    queryKey: labKeys.myArea(),
    queryFn: ({ signal }) => labService.getMyAreaDashboard({ signal }),
    staleTime: STALE_TIME,
  });
}

export function useAreaMetrics(areaId: number) {
  return useQuery({
    queryKey: labKeys.areaMetrics(areaId),
    queryFn: ({ signal }) => labService.getAreaMetrics(areaId, { signal }),
    enabled: areaId > 0,
    staleTime: STALE_TIME,
  });
}

export function useMyPending() {
  return useQuery({
    queryKey: labKeys.myPending(),
    queryFn: ({ signal }) => labService.getMyPending({ signal }),
    staleTime: 15_000,
  });
}

export function useUrgentRequests() {
  return useQuery({
    queryKey: labKeys.urgent(),
    queryFn: ({ signal }) => labService.getUrgentRequests({ signal }),
    staleTime: 10_000,
  });
}

// ── Requests ─────────────────────────────────────────────────────────────────

export function useLabRequests(params?: LabRequestListParams) {
  return useQuery({
    queryKey: labKeys.requests(params),
    queryFn: ({ signal }) => labService.getLabRequests(params, { signal }),
    staleTime: STALE_TIME,
    placeholderData: (prev) => prev,
  });
}

export function useLabRequestDetail(id: number) {
  return useQuery({
    queryKey: labKeys.requestDetail(id),
    queryFn: ({ signal }) => labService.getLabRequestById(id, { signal }),
    enabled: id > 0,
  });
}

export function useCreateLabRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLabRequestInput) => labService.createLabRequest(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:requestCreated'));
    },
    onError: () => {
      toast.error(i18n.t('lab:requestCreateError'));
    },
  });
}

export function useUpdateLabRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<CreateLabRequestInput> }) =>
      labService.updateLabRequest(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:requestUpdated'));
    },
    onError: () => {
      toast.error(i18n.t('lab:requestUpdateError'));
    },
  });
}

export function useDeleteLabRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => labService.deleteLabRequest(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:requestDeleted'));
    },
    onError: () => {
      toast.error(i18n.t('lab:requestDeleteError'));
    },
  });
}

export function useCancelLabRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      labService.cancelLabRequest(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:requestCancelled'));
    },
    onError: () => {
      toast.error(i18n.t('lab:requestCancelError'));
    },
  });
}

export function useUpdateLabRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      labService.updateLabRequestStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:statusUpdated'));
    },
    onError: () => {
      toast.error(i18n.t('lab:statusUpdateError'));
    },
  });
}

// ── Request Items ────────────────────────────────────────────────────────────

export function useLabRequestItems(requestId: number) {
  return useQuery({
    queryKey: labKeys.items(requestId),
    queryFn: ({ signal }) => labService.getLabRequestItems(requestId, { signal }),
    enabled: requestId > 0,
  });
}

export function useAddLabRequestItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      input,
    }: {
      requestId: number;
      input: { lab_test_id: number; notes?: string };
    }) => labService.addLabRequestItem(requestId, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: labKeys.items(variables.requestId) });
      void queryClient.invalidateQueries({ queryKey: labKeys.requestDetail(variables.requestId) });
      toast.success(i18n.t('lab:itemAdded'));
    },
  });
}

export function useUpdateLabRequestItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      itemId,
      input,
    }: {
      requestId: number;
      itemId: number;
      input: Partial<Record<string, unknown>>;
    }) => labService.updateLabRequestItem(requestId, itemId, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: labKeys.items(variables.requestId) });
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:itemUpdated'));
    },
  });
}

export function useRemoveLabRequestItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, itemId }: { requestId: number; itemId: number }) =>
      labService.removeLabRequestItem(requestId, itemId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: labKeys.items(variables.requestId) });
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:itemDeleted'));
    },
  });
}

// ── Result Entry ─────────────────────────────────────────────────────────────

export function useEnterResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      itemId,
      input,
    }: {
      requestId: number;
      itemId: number;
      input: { result_value: string; unit?: string; notes?: string; results?: Record<string, unknown> };
    }) => labService.enterResult(requestId, itemId, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: labKeys.items(variables.requestId) });
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:resultRegistered'));
    },
    onError: () => {
      toast.error(i18n.t('lab:resultRegisterError'));
    },
  });
}

export function useUpdateResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      itemId,
      input,
    }: {
      requestId: number;
      itemId: number;
      input: { result_value: string; unit?: string; notes?: string; results?: Record<string, unknown> };
    }) => labService.updateResult(requestId, itemId, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: labKeys.items(variables.requestId) });
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:resultUpdated'));
    },
  });
}

// ── Validation ───────────────────────────────────────────────────────────────

export function useValidateTech() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      itemId,
      notes,
    }: {
      requestId: number;
      itemId: number;
      notes?: string;
    }) => labService.validateTech(requestId, itemId, { notes }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: labKeys.items(variables.requestId) });
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:validatedByTech'));
    },
    onError: () => {
      toast.error(i18n.t('lab:validationError'));
    },
  });
}

export function useValidateDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      itemId,
      notes,
    }: {
      requestId: number;
      itemId: number;
      notes?: string;
    }) => labService.validateDoctor(requestId, itemId, { notes }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: labKeys.items(variables.requestId) });
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:validatedByDoctor'));
    },
    onError: () => {
      toast.error(i18n.t('lab:validationError'));
    },
  });
}

export function useSignResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, itemId }: { requestId: number; itemId: number }) =>
      labService.signResult(requestId, itemId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: labKeys.items(variables.requestId) });
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:resultSigned'));
    },
    onError: () => {
      toast.error(i18n.t('lab:signError'));
    },
  });
}

export function useDeliverResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      itemId,
      method,
    }: {
      requestId: number;
      itemId: number;
      method?: string;
    }) => labService.deliverResult(requestId, itemId, { method }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: labKeys.items(variables.requestId) });
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:resultDelivered'));
    },
  });
}

// ── Samples ──────────────────────────────────────────────────────────────────

export function useSamples(params?: { requestId?: number; status?: string; areaId?: number }) {
  return useQuery({
    queryKey: labKeys.samples(params),
    queryFn: ({ signal }) => labService.getSamples(params, { signal }),
    staleTime: STALE_TIME,
  });
}

export function useSampleDetail(id: number) {
  return useQuery({
    queryKey: labKeys.sampleDetail(id),
    queryFn: ({ signal }) => labService.getSampleById(id, { signal }),
    enabled: id > 0,
  });
}

export function useCreateSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof labService.createSample>[0]) =>
      labService.createSample(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:sampleCreated'));
    },
  });
}

export function useUpdateSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<Record<string, unknown>> }) =>
      labService.updateSample(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:sampleUpdated'));
    },
  });
}

export function useReceiveSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => labService.receiveSample(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:sampleReceived'));
    },
  });
}

export function useVerifySample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => labService.verifySample(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:sampleVerified'));
    },
  });
}

export function useRejectSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      labService.rejectSample(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:sampleRejected'));
    },
  });
}

// ── Result History ───────────────────────────────────────────────────────────

export function useResultHistory(patientId: number, testId: number) {
  return useQuery({
    queryKey: labKeys.resultHistory(patientId, testId),
    queryFn: ({ signal }) => labService.getResultHistory(patientId, testId, { signal }),
    enabled: patientId > 0 && testId > 0,
  });
}

// ── QC Records ───────────────────────────────────────────────────────────────

export function useQCRecords(params?: { areaId?: number; testId?: number; type?: string }) {
  return useQuery({
    queryKey: labKeys.qcRecords(params),
    queryFn: ({ signal }) => labService.getQCRecords(params, { signal }),
    staleTime: STALE_TIME,
  });
}

export function useCreateQCRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Record<string, unknown>>) => labService.createQCRecord(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:qcCreated'));
    },
  });
}

export function useApproveQCRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => labService.approveQCRecord(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:qcApproved'));
    },
  });
}

// ── Equipment ────────────────────────────────────────────────────────────────

export function useLabEquipment(params?: { areaId?: number }) {
  return useQuery({
    queryKey: labKeys.equipment(params),
    queryFn: ({ signal }) => labService.getEquipment(params, { signal }),
    staleTime: STALE_TIME,
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Record<string, unknown>>) => labService.createEquipment(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:equipmentRegistered'));
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<Record<string, unknown>> }) =>
      labService.updateEquipment(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:equipmentUpdated'));
    },
  });
}

// ── Reagents ─────────────────────────────────────────────────────────────────

export function useLabReagents(params?: { areaId?: number }) {
  return useQuery({
    queryKey: labKeys.reagents(params),
    queryFn: ({ signal }) => labService.getReagents(params, { signal }),
    staleTime: STALE_TIME,
  });
}

export function useCreateReagent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Record<string, unknown>>) => labService.createReagent(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:reagentRegistered'));
    },
  });
}

export function useUpdateReagent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<Record<string, unknown>> }) =>
      labService.updateReagent(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success(i18n.t('lab:reagentUpdated'));
    },
  });
}

// ── Areas & Tests ────────────────────────────────────────────────────────────

export function useLabAreas() {
  return useQuery({
    queryKey: labKeys.areas(),
    queryFn: ({ signal }) => labService.getLabAreas({ signal }),
    staleTime: 60_000,
  });
}

export function useLabTests(params?: { areaId?: number }) {
  return useQuery({
    queryKey: labKeys.tests(params),
    queryFn: ({ signal }) => labService.getLabTests(params, { signal }),
    staleTime: 60_000,
  });
}

// ── Analytics ────────────────────────────────────────────────────────────────

export function useLabAnalytics(params?: {
  dateFrom?: string;
  dateTo?: string;
  areaId?: number;
}) {
  return useQuery({
    queryKey: labKeys.analytics(params),
    queryFn: ({ signal }) => labService.getLabAnalytics(params, { signal }),
    staleTime: 60_000,
  });
}

// ── Notifications ────────────────────────────────────────────────────────────

export function useLabNotifications() {
  return useQuery({
    queryKey: labKeys.notifications(),
    queryFn: ({ signal }) => labService.getLabNotifications({ signal }),
    staleTime: 10_000,
  });
}

export function useAcknowledgeNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => labService.acknowledgeNotification(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.notifications() });
    },
  });
}

export function useAcknowledgeAllNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: labService.acknowledgeAllNotifications,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.notifications() });
      toast.success(i18n.t('lab:notificationsRead'));
    },
  });
}

// ── Filter State ─────────────────────────────────────────────────────────────

export function useLabFilters() {
  const [filters, setFilters] = useState<LabFilterState>(DEFAULT_FILTER_STATE);

  const updateFilter = useCallback(
    <K extends keyof LabFilterState>(key: K, value: LabFilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTER_STATE);
  }, []);

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'isCritical' || key === 'isRepeated' || key === 'onlyUrgent') return value;
    return value !== '' && value !== undefined;
  });

  return { filters, updateFilter, resetFilters, hasActiveFilters };
}

// ── SSE ──────────────────────────────────────────────────────────────────────

export interface LabSSEEvent {
  type: string;
  payload: unknown;
}

export function useLabSSE() {
  const queryClient = useQueryClient();
  const [events, setEvents] = useState<LabSSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventsRef = useRef<LabSSEEvent[]>([]);

  const handleEvent = useCallback(
    (event: MessageEvent) => {
      const newEvent: LabSSEEvent = { type: event.type || 'message', payload: event.data };
      eventsRef.current = [newEvent, ...eventsRef.current].slice(0, 50);
      setEvents([...eventsRef.current]);

      void queryClient.invalidateQueries({ queryKey: labKeys.all });
    },
    [queryClient]
  );

  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = labService.subscribeToLabSSE(handleEvent);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }

    return () => {
      eventSource?.close();
      setIsConnected(false);
    };
  }, [handleEvent]);

  const clearEvents = useCallback(() => {
    eventsRef.current = [];
    setEvents([]);
  }, []);

  return { events, isConnected, clearEvents };
}
