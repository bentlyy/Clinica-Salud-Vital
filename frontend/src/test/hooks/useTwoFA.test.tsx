import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const twoFAService = vi.hoisted(() => ({
  getStatus: vi.fn(),
  generate: vi.fn(),
  verify: vi.fn(),
  disable: vi.fn(),
}));

vi.mock('@/modules/2fa/services/two-fa.service', () => ({ twoFAService }));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn(), t: (key: string) => key },
}));

import {
  useTwoFAStatus,
  useGenerateTwoFA,
  useVerifyTwoFA,
  useDisableTwoFA,
  twoFAKeys,
} from '@/modules/2fa/hooks/useTwoFA';
import toast from 'react-hot-toast';

let queryClient: QueryClient;

function createWrapper() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  vi.spyOn(queryClient, 'invalidateQueries');
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('2fa hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useTwoFAStatus queries the status endpoint', async () => {
    twoFAService.getStatus.mockResolvedValue({ enabled: true });
    const { result } = renderHook(() => useTwoFAStatus(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(twoFAService.getStatus).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(result.current.data).toEqual({ enabled: true });
  });

  it('useGenerateTwoFA calls generate and shows an error toast on failure', async () => {
    twoFAService.generate.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useGenerateTwoFA(), { wrapper: createWrapper() });
    act(() => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(twoFAService.generate).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('two_fa:generateError');
  });

  it('useVerifyTwoFA invalidates the status query and shows a success toast', async () => {
    twoFAService.verify.mockResolvedValue({ message: 'ok' });
    const { result } = renderHook(() => useVerifyTwoFA(), { wrapper: createWrapper() });
    act(() => {
      result.current.mutate('123456');
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(twoFAService.verify).toHaveBeenCalledWith('123456');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: twoFAKeys.status });
    expect(toast.success).toHaveBeenCalledWith('two_fa:enabled');
  });

  it('useVerifyTwoFA shows an error toast for an invalid code', async () => {
    twoFAService.verify.mockRejectedValue(new Error('bad'));
    const { result } = renderHook(() => useVerifyTwoFA(), { wrapper: createWrapper() });
    act(() => {
      result.current.mutate('000000');
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('two_fa:invalid_code');
  });

  it('useDisableTwoFA invalidates the status query and shows a success toast', async () => {
    twoFAService.disable.mockResolvedValue({ message: 'ok' });
    const { result } = renderHook(() => useDisableTwoFA(), { wrapper: createWrapper() });
    act(() => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: twoFAKeys.status });
    expect(toast.success).toHaveBeenCalledWith('two_fa:disabled');
  });
});
