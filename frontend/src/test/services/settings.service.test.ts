import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserProfile } from '@/modules/settings/types/settings.types';

const apiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import { settingsService } from '@/modules/settings/services/settings.service';

const profile: UserProfile = {
  id: 1,
  name: 'Maria Garcia',
  email: 'maria@clinic.com',
  phone: '+56912345678',
  role: 'doctor',
};

describe('settingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getProfile: GETs /auth/me with signal', async () => {
    apiClient.get.mockResolvedValue({ data: profile });
    const signal = new AbortController().signal;
    const result = await settingsService.getProfile({ signal });
    expect(apiClient.get).toHaveBeenCalledWith('/auth/me', { signal });
    expect(result).toEqual(profile);
  });

  it('changePassword: POSTs /auth/change-password with input', async () => {
    apiClient.post.mockResolvedValue({ data: { message: 'ok' } });
    const input = { current_password: 'old', new_password: 'new-pass-123' };
    const result = await settingsService.changePassword(input);
    expect(apiClient.post).toHaveBeenCalledWith('/auth/change-password', input, { signal: undefined });
    expect(result.message).toBe('ok');
  });
});
