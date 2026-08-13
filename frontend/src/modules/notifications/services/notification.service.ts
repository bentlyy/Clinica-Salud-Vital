import { apiClient } from '@/shared/services/api-client';

export const notificationService = {
  async list(params: { page?: number; limit?: number; tenantId?: string; is_read?: boolean } = {}, opts?: { signal?: AbortSignal }) {
    const { tenantId, ...rest } = params;
    const requestParams = tenantId ? { ...rest, tenant_id: tenantId } : rest;
    const { data } = await apiClient.get('/notifications', { params: requestParams, signal: opts?.signal });
    return data;
  },

  async markAsRead(id: number, opts?: { signal?: AbortSignal }) {
    const { data } = await apiClient.patch(`/notifications/${id}/read`, undefined, { signal: opts?.signal });
    return data;
  },

  async markAllAsRead(opts?: { signal?: AbortSignal }) {
    const { data } = await apiClient.patch('/notifications/read-all', undefined, { signal: opts?.signal });
    return data;
  },
};
