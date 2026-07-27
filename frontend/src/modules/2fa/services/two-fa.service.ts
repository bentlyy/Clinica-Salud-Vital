import { apiClient } from '@/shared/services/api-client';
import type { TwoFAStatus, TwoFAGenerateResponse } from '../types/two-fa.types';

export const twoFAService = {
  async getStatus(opts?: { signal?: AbortSignal }): Promise<TwoFAStatus> {
    const { data } = await apiClient.get<TwoFAStatus>('/2fa/status', { signal: opts?.signal });
    return data;
  },

  async generate(opts?: { signal?: AbortSignal }): Promise<TwoFAGenerateResponse> {
    const { data } = await apiClient.post<TwoFAGenerateResponse>('/2fa/generate', undefined, { signal: opts?.signal });
    return data;
  },

  async verify(code: string, opts?: { signal?: AbortSignal }): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/2fa/verify', { code }, { signal: opts?.signal });
    return data;
  },

  async disable(opts?: { signal?: AbortSignal }): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>('/2fa', { signal: opts?.signal });
    return data;
  },
};
