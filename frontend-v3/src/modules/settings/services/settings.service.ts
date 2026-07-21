import { apiClient } from '@/shared/services/api-client';
import type { UserProfile, ChangePasswordInput } from '../types/settings.types';

export const settingsService = {
  async getProfile(): Promise<UserProfile> {
    const { data } = await apiClient.get<UserProfile>('/auth/me');
    return data;
  },

  async changePassword(input: ChangePasswordInput): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/change-password', input);
    return data;
  },
};
