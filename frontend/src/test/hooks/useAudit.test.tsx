import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const auditService = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock('@/modules/audit/services/audit.service', () => ({ auditService }));

import { useAuditList, auditKeys } from '@/modules/audit/hooks/useAudit';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAuditList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries the audit list with the given params and forwards the signal', async () => {
    const payload = {
      data: [{ id: 1, action: 'create', entity_type: 'patient' }],
      total: 1,
      page: 1,
      limit: 15,
      totalPages: 1,
    };
    auditService.list.mockResolvedValue(payload);

    const { result } = renderHook(() => useAuditList({ page: 1, limit: 15 }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(auditService.list).toHaveBeenCalledWith(
      { page: 1, limit: 15 },
      { signal: expect.any(AbortSignal) },
    );
    expect(result.current.data).toEqual(payload);
  });

  it('builds stable query keys per params', async () => {
    auditService.list.mockResolvedValue({ data: [], total: 0, page: 1, limit: 15, totalPages: 0 });
    renderHook(() => useAuditList(), { wrapper: createWrapper() });
    await waitFor(() => expect(auditService.list).toHaveBeenCalled());

    expect(auditKeys.all).toEqual(['audit']);
    expect(auditKeys.list({ page: 2 })).toEqual(['audit', 'list', { page: 2 }]);
  });

  it('exposes the error state when the query fails', async () => {
    auditService.list.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAuditList(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
