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
    const { data } = await apiClient.get<{ data: BackendSession[] }>('/auth/sessions', { signal: opts?.signal });
    return (data.data ?? []).map((s) => ({
      id: s.id,
      tenant_id: s.tenant_id,
      user_id: s.user_id,
      device: s.user_agent,
      ip_address: s.ip_address,
      created_at: s.created_at,
      last_activity: s.last_seen_at,
      revoked_at: s.revoked_at,
    }));
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

interface BackendSession {
  id: number;
  tenant_id: string;
  user_id: number;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}
