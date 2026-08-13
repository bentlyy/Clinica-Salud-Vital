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

  async getSessions(opts?: { signal?: AbortSignal }): Promise<Session[]> {
    const { data } = await apiClient.get<{ data: Session[] }>('/auth/sessions', { signal: opts?.signal });
    return data.data;
  },

  async revokeSession(id: number, opts?: { signal?: AbortSignal }): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(`/auth/sessions/${id}`, { signal: opts?.signal });
    return data;
  },
};

export interface Session {
  id: number;
  tenant_id: string;
  user_id: number;
  device: string | null;
  ip_address: string | null;
  created_at: string;
  last_activity: string | null;
  revoked_at: string | null;
}
