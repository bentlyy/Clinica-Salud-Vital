import { apiClient } from '@/shared/services/api-client';
import { getAccessToken } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type {
  LabRequest,
  LabEquipment,
  LabMetrics,
  CreateLabRequestInput,
  LabRequestListParams,
} from '../types/lab.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function wrapArray<T>(arr: unknown, params?: { page?: number; limit?: number }): PaginatedResponse<T> {
  if (Array.isArray(arr)) {
    return {
      data: arr as T[],
      total: (arr as T[]).length,
      page: params?.page || 1,
      limit: params?.limit || (arr as T[]).length || 50,
      totalPages: 1,
    };
  }
  return arr as PaginatedResponse<T>;
}

export const labService = {
  listRequests(params?: LabRequestListParams): Promise<PaginatedResponse<LabRequest>> {
    return apiClient.get('/laboratory/', { params }).then((r) => wrapArray<LabRequest>(r.data, params));
  },

  getRequestById(id: number): Promise<LabRequest> {
    return apiClient.get(`/laboratory/${id}`).then((r) => r.data);
  },

  createRequest(input: CreateLabRequestInput): Promise<LabRequest> {
    return apiClient.post('/laboratory/', input).then((r) => r.data);
  },

  updateRequestStatus(id: number, status: string): Promise<LabRequest> {
    return apiClient.patch(`/laboratory/${id}/status`, { status }).then((r) => r.data);
  },

  getDashboard(): Promise<LabMetrics> {
    return apiClient.get('/laboratory/dashboard').then((r) => {
      const raw = r.data;
      return {
        pending_requests: Number(raw.pending ?? 0),
        in_progress: Number(raw.in_progress ?? 0),
        completed_today: Number(raw.samples_processed_today ?? 0),
        validated_today: Number(raw.validated ?? 0),
        avg_turnaround_hours: raw.average_processing_time_min
          ? Number(raw.average_processing_time_min) / 60
          : 0,
      };
    });
  },

  listEquipment(): Promise<LabEquipment[]> {
    return apiClient.get('/laboratory/equipment').then((r) => {
      const raw = r.data;
      if (Array.isArray(raw)) {
        return raw.map((eq: any) => ({
          ...eq,
          type: eq.type || eq.connection_type || 'N/A',
        }));
      }
      return raw;
    });
  },

  updateItemResult(itemId: number, input: { value: string; unit?: string; reference_range?: string; notes?: string }) {
    return apiClient.patch(`/laboratory/items/${itemId}/result`, {
      result_value: input.value,
      result_notes: input.notes,
    }).then((r) => r.data);
  },

  validateItemTech(itemId: number) {
    return apiClient.patch(`/laboratory/items/${itemId}/validate-tech`).then((r) => r.data);
  },

  validateItemDoctor(itemId: number) {
    return apiClient.patch(`/laboratory/items/${itemId}/validate-doctor`).then((r) => r.data);
  },

  deliverItem(itemId: number) {
    return apiClient.patch(`/laboratory/items/${itemId}/deliver`).then((r) => r.data);
  },

  listLabRequests(params?: LabRequestListParams): Promise<PaginatedResponse<LabRequest>> {
    return apiClient.get('/laboratory/lab/all', { params }).then((r) => wrapArray<LabRequest>(r.data, params));
  },

  connectSSE(onEvent: (event: string, data: unknown) => void): () => void {
    const token = getAccessToken();
    if (!token) return () => {};

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let aborted = false;
    const controller = new AbortController();

    async function connect() {
      try {
        const response = await fetch(`${API_URL}/laboratory/events`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let eventType = 'message';
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              eventData = line.slice(5).trim();
            } else if (line.trim() === '' && eventData) {
              try {
                const parsed = JSON.parse(eventData);
                onEvent(eventType, parsed);
              } catch {
                onEvent(eventType, eventData);
              }
              eventType = 'message';
              eventData = '';
            }
          }
        }
      } catch (err) {
        if (!aborted) console.error('SSE connection error:', err);
      }
    }

    void connect();

    return () => {
      aborted = true;
      controller.abort();
      if (reader) void reader.cancel();
    };
  },
};
