import { apiClient } from '@/shared/services/api-client';

export const notificationService = {
  async list(params: { page?: number; limit?: number } = {}, opts?: { signal?: AbortSignal }) {
    const { data } = await apiClient.get('/laboratory/notifications', { params, signal: opts?.signal });
    return data;
  },

  async markAsRead(id: number, opts?: { signal?: AbortSignal }) {
    const { data } = await apiClient.patch(`/laboratory/notifications/${id}/ack`, undefined, { signal: opts?.signal });
    return data;
  },
};
