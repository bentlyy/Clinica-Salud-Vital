import { apiClient } from '@/shared/services/api-client';
import type { TwoFAStatus, TwoFAGenerateResponse } from '../types/two-fa.types';

export const twoFAService = {
  async getStatus(): Promise<TwoFAStatus> {
    const { data } = await apiClient.get<TwoFAStatus>('/2fa/status');
    return data;
  },

  async generate(): Promise<TwoFAGenerateResponse> {
    const { data } = await apiClient.post<TwoFAGenerateResponse>('/2fa/generate');
    return data;
  },

  async verify(code: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/2fa/verify', { code });
    return data;
  },

  async disable(): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>('/2fa');
    return data;
  },
};
