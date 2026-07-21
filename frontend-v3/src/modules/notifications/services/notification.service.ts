import { apiClient } from '@/shared/services/api-client';

export const notificationService = {
  async list(params: { page?: number; limit?: number } = {}) {
    const { data } = await apiClient.get('/laboratory/notifications', { params });
    return data;
  },

  async markAsRead(id: number) {
    const { data } = await apiClient.patch(`/laboratory/notifications/${id}/ack`);
    return data;
  },
};
