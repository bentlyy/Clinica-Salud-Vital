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

export const labService = {
  listRequests(params?: LabRequestListParams): Promise<PaginatedResponse<LabRequest>> {
    return apiClient.get('/laboratory/', { params }).then((r) => r.data);
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
    return apiClient.get('/laboratory/dashboard').then((r) => r.data);
  },

  listEquipment(): Promise<LabEquipment[]> {
    return apiClient.get('/laboratory/equipment').then((r) => r.data);
  },

  updateItemResult(itemId: number, input: { value: string; unit?: string; reference_range?: string; notes?: string }) {
    return apiClient.patch(`/laboratory/items/${itemId}/result`, input).then((r) => r.data);
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
    return apiClient.get('/laboratory/lab/all', { params }).then((r) => r.data);
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
