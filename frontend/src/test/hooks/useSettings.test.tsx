import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { UserProfile, ChangePasswordInput } from '@/modules/settings/types/settings.types';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const i18nMock = vi.hoisted(() => ({
  t: vi.fn((key: string) => `[${key}]`),
}));

vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/i18n/i18n', () => ({ default: i18nMock }));

const settingsService = vi.hoisted(() => ({
  getProfile: vi.fn(),
  changePassword: vi.fn(),
}));

vi.mock('@/modules/settings/services/settings.service', () => ({ settingsService }));

import { useProfile, useChangePassword } from '@/modules/settings/hooks/useSettings';

const profile: UserProfile = {
  id: 1,
  name: 'Maria Garcia',
  email: 'maria@clinic.com',
  phone: '+56912345678',
  role: 'doctor',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useSettings hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useProfile: fetches the profile', async () => {
    settingsService.getProfile.mockResolvedValue(profile);
    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(settingsService.getProfile).toHaveBeenCalled();
    expect(result.current.data).toEqual(profile);
  });

  it('useChangePassword: changes the password and toasts', async () => {
    settingsService.changePassword.mockResolvedValue({ message: 'ok' });
    const { result } = renderHook(() => useChangePassword(), { wrapper: createWrapper() });

    const input: ChangePasswordInput = { current_password: 'old-pass', new_password: 'new-pass-123' };
    result.current.mutate(input);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(settingsService.changePassword).toHaveBeenCalledWith(input);
    expect(toast.success).toHaveBeenCalledWith('[settings:passwordChanged]');
  });
});
