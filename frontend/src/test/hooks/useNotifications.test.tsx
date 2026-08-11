import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const notificationService = vi.hoisted(() => ({
  list: vi.fn(),
  markAsRead: vi.fn(),
}));

vi.mock('@/modules/notifications/services/notification.service', () => ({ notificationService }));

import { useNotifications, useMarkAsRead, notificationKeys } from '@/modules/notifications/hooks/useNotifications';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useNotifications hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationService.list.mockResolvedValue({ data: [], total: 0 });
    notificationService.markAsRead.mockResolvedValue({ ok: true });
  });

  it('useNotifications fetches the notification list', async () => {
    notificationService.list.mockResolvedValue({ data: [{ id: 1 }], total: 1 });

    const { result } = renderHook(() => useNotifications({ page: 1, limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(notificationService.list).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      { signal: expect.any(AbortSignal) },
    );
    expect(result.current.data?.total).toBe(1);
  });

  it('useMarkAsRead marks a notification as read', async () => {
    const { result } = renderHook(() => useMarkAsRead(), { wrapper: createWrapper() });

    result.current.mutate(42);

    await waitFor(() => expect(notificationService.markAsRead).toHaveBeenCalledWith(42));
  });

  it('exposes the notification keys factory', () => {
    expect(notificationKeys.all).toEqual(['notifications']);
    expect(notificationKeys.list({ page: 1 })).toEqual(['notifications', 'list', { page: 1 }]);
  });
});
