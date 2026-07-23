import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { labService } from '../services/lab.service';
import type {
  LabRequestListParams,
  CreateLabRequestInput,
} from '../types/lab.types';

export const labKeys = {
  all: ['laboratory'] as const,
  requests: (params?: LabRequestListParams) => ['laboratory', 'requests', params] as const,
  requestDetail: (id: number) => ['laboratory', 'requests', id] as const,
  dashboard: () => ['laboratory', 'dashboard'] as const,
  equipment: () => ['laboratory', 'equipment'] as const,
};

const STALE_TIME = 30_000;

export function useLabRequests(params?: LabRequestListParams) {
  return useQuery({
    queryKey: labKeys.requests(params),
    queryFn: () => labService.listRequests(params),
    staleTime: STALE_TIME,
    placeholderData: (prev) => prev,
  });
}

export function useLabRequestDetail(id: number) {
  return useQuery({
    queryKey: labKeys.requestDetail(id),
    queryFn: () => labService.getRequestById(id),
    enabled: id > 0,
  });
}

export function useCreateLabRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLabRequestInput) => labService.createRequest(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success('Solicitud de laboratorio creada');
    },
    onError: () => {
      toast.error('Error al crear la solicitud');
    },
  });
}

export function useUpdateLabRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      labService.updateRequestStatus(id, status),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      void queryClient.invalidateQueries({ queryKey: labKeys.requestDetail(variables.id) });
      toast.success('Estado actualizado');
    },
    onError: () => {
      toast.error('Error al actualizar estado');
    },
  });
}

export function useUpdateItemResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: number; input: { value: string; unit?: string; reference_range?: string; notes?: string } }) =>
      labService.updateItemResult(itemId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success('Resultado actualizado');
    },
  });
}

export function useValidateItemTech() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => labService.validateItemTech(itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success('Validado por técnico');
    },
  });
}

export function useValidateItemDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => labService.validateItemDoctor(itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success('Validado por doctor');
    },
  });
}

export function useDeliverItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => labService.deliverItem(itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: labKeys.all });
      toast.success('Entregado');
    },
  });
}

export function useLabDashboard() {
  return useQuery({
    queryKey: labKeys.dashboard(),
    queryFn: () => labService.getDashboard(),
    staleTime: STALE_TIME,
  });
}

export function useLabEquipment() {
  return useQuery({
    queryKey: labKeys.equipment(),
    queryFn: () => labService.listEquipment(),
    staleTime: STALE_TIME,
  });
}

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
    (event: string, data: unknown) => {
      const newEvent: LabSSEEvent = { type: event, payload: data };
      eventsRef.current = [newEvent, ...eventsRef.current].slice(0, 50);
      setEvents([...eventsRef.current]);

      if (event === 'status-change' || event === 'new-request' || event === 'metrics') {
        void queryClient.invalidateQueries({ queryKey: labKeys.all });
      }
    },
    [queryClient],
  );

  useEffect(() => {
    const disconnect = labService.connectSSE(handleEvent);
    setIsConnected(true);

    return () => {
      disconnect();
      setIsConnected(false);
    };
  }, [handleEvent]);

  const clearEvents = useCallback(() => {
    eventsRef.current = [];
    setEvents([]);
  }, []);

  return { events, isConnected, clearEvents };
}
