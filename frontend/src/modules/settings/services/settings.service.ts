import { apiClient } from '@/shared/services/api-client';
import type { UserProfile, ChangePasswordInput } from '../types/settings.types';

export const settingsService = {
  async getProfile(opts?: { signal?: AbortSignal }): Promise<UserProfile> {
    const { data } = await apiClient.get<UserProfile>('/auth/me', { signal: opts?.signal });
    return data;
  },

  async changePassword(input: ChangePasswordInput, opts?: { signal?: AbortSignal }): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/change-password', input, { signal: opts?.signal });
    return data;
  },
};
