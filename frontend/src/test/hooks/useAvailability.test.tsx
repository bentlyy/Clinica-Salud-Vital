import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { AvailabilityRule, AvailabilityException } from '@/modules/availability/types/availability.types';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const i18nMock = vi.hoisted(() => ({
  t: vi.fn((key: string) => `[${key}]`),
}));

vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/i18n/i18n', () => ({ default: i18nMock }));

const availabilityService = vi.hoisted(() => ({
  getRules: vi.fn(),
  createRule: vi.fn(),
  deleteRule: vi.fn(),
  getExceptions: vi.fn(),
  createException: vi.fn(),
  deleteException: vi.fn(),
}));

vi.mock('@/modules/availability/services/availability.service', () => ({ availabilityService }));

import {
  useAvailabilityRules,
  useCreateAvailabilityRule,
  useDeleteAvailabilityRule,
  useAvailabilityExceptions,
  useCreateAvailabilityException,
  useDeleteAvailabilityException,
} from '@/modules/availability/hooks/useAvailability';

const rule: AvailabilityRule = {
  id: 1,
  doctor_id: 2,
  day_of_week: 1,
  start_time: '08:00',
  end_time: '12:00',
  created_at: '2026-08-01T10:00:00Z',
};

const exception: AvailabilityException = {
  id: 3,
  doctor_id: 2,
  date: '2026-09-01',
  start_time: null,
  end_time: null,
  reason: 'Vacaciones',
  created_at: '2026-08-01T10:00:00Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useAvailability hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useAvailabilityRules: fetches rules', async () => {
    availabilityService.getRules.mockResolvedValue([rule]);
    const { result } = renderHook(() => useAvailabilityRules(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(availabilityService.getRules).toHaveBeenCalled();
    expect(result.current.data).toEqual([rule]);
  });

  it('useAvailabilityExceptions: fetches exceptions', async () => {
    availabilityService.getExceptions.mockResolvedValue([exception]);
    const { result } = renderHook(() => useAvailabilityExceptions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([exception]);
  });

  it('useCreateAvailabilityRule: creates a rule, toasts success and invalidates', async () => {
    availabilityService.createRule.mockResolvedValue(rule);
    const { result } = renderHook(() => useCreateAvailabilityRule(), { wrapper: createWrapper() });

    result.current.mutate({ day_of_week: 1, start_time: '08:00', end_time: '12:00' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(availabilityService.createRule).toHaveBeenCalledWith({ day_of_week: 1, start_time: '08:00', end_time: '12:00' });
    expect(toast.success).toHaveBeenCalledWith('[availability:ruleCreated]');
  });

  it('useCreateAvailabilityRule: toasts error on failure', async () => {
    availabilityService.createRule.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useCreateAvailabilityRule(), { wrapper: createWrapper() });

    result.current.mutate({ day_of_week: 2, start_time: '09:00', end_time: '11:00' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('[availability:ruleCreateError]');
  });

  it('useDeleteAvailabilityRule: deletes a rule and toasts', async () => {
    availabilityService.deleteRule.mockResolvedValue({});
    const { result } = renderHook(() => useDeleteAvailabilityRule(), { wrapper: createWrapper() });

    result.current.mutate(1);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(availabilityService.deleteRule).toHaveBeenCalledWith(1);
    expect(toast.success).toHaveBeenCalledWith('[availability:ruleDeleted]');
  });

  it('useCreateAvailabilityException: creates an exception and toasts', async () => {
    availabilityService.createException.mockResolvedValue(exception);
    const { result } = renderHook(() => useCreateAvailabilityException(), { wrapper: createWrapper() });

    result.current.mutate({ date: '2026-09-01', reason: 'Vacaciones' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(availabilityService.createException).toHaveBeenCalledWith({ date: '2026-09-01', reason: 'Vacaciones' });
    expect(toast.success).toHaveBeenCalledWith('[availability:exceptionCreated]');
  });

  it('useDeleteAvailabilityException: deletes an exception and toasts', async () => {
    availabilityService.deleteException.mockResolvedValue({});
    const { result } = renderHook(() => useDeleteAvailabilityException(), { wrapper: createWrapper() });

    result.current.mutate(3);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(availabilityService.deleteException).toHaveBeenCalledWith(3);
    expect(toast.success).toHaveBeenCalledWith('[availability:exceptionDeleted]');
  });
});
