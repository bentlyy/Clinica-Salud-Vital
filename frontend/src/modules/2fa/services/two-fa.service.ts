import { apiClient } from '@/shared/services/api-client';
import type { TwoFAStatus, TwoFAGenerateResponse } from '../types/two-fa.types';

export const twoFAService = {
  async getStatus(opts?: { signal?: AbortSignal }): Promise<TwoFAStatus> {
    const { data } = await apiClient.get<TwoFAStatus>('/auth/2fa/status', { signal: opts?.signal });
    return data;
  },

  async generate(opts?: { signal?: AbortSignal }): Promise<TwoFAGenerateResponse> {
    const { data } = await apiClient.post<{ secret: string; qrCodeUrl: string }>(
      '/auth/2fa/enable',
      undefined,
      { signal: opts?.signal },
    );
    return { secret: data.secret, qr_code: data.qrCodeUrl };
  },

  async verify(code: string, opts?: { signal?: AbortSignal }): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/2fa/verify', { token: code }, { signal: opts?.signal });
    return data;
  },

  async disable(input: { password: string; totp_token?: string }, opts?: { signal?: AbortSignal }): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/2fa/disable', input, { signal: opts?.signal });
    return data;
  },
};
