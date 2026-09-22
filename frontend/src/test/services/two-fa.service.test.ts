import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiClient = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import { twoFAService } from '@/modules/2fa/services/two-fa.service';

describe('2fa service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getStatus returns the enabled flag', async () => {
    apiClient.get.mockResolvedValue({ data: { enabled: true } });
    await expect(twoFAService.getStatus({})).resolves.toEqual({ enabled: true });
    expect(apiClient.get).toHaveBeenCalledWith('/auth/2fa/status', { signal: undefined });
  });

  it('generate posts to enable and returns the qr code and secret', async () => {
    apiClient.post.mockResolvedValue({ data: { secret: 'ABC123', qrCodeUrl: 'data:image/png;base64,x' } });
    await expect(twoFAService.generate()).resolves.toEqual({
      qr_code: 'data:image/png;base64,x',
      secret: 'ABC123',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/auth/2fa/enable', undefined, { signal: undefined });
  });

  it('verify posts the token and returns the confirmation message', async () => {
    apiClient.post.mockResolvedValue({ data: { message: '2FA enabled' } });
    const signal = new AbortController().signal;
    await expect(twoFAService.verify('123456', { signal })).resolves.toEqual({ message: '2FA enabled' });
    expect(apiClient.post).toHaveBeenCalledWith('/auth/2fa/verify', { token: '123456' }, { signal });
  });

  it('disable posts password and totp code to the disable endpoint', async () => {
    apiClient.post.mockResolvedValue({ data: { message: '2FA disabled' } });
    await expect(twoFAService.disable({ password: 'secret-pass', totp_token: '123456' })).resolves.toEqual({
      message: '2FA disabled',
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/2fa/disable',
      { password: 'secret-pass', totp_token: '123456' },
      { signal: undefined },
    );
  });
});
