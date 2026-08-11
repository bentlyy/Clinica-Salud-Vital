import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiClient = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import { auditService } from '@/modules/audit/services/audit.service';

describe('audit service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists audit logs with the given params and forwards the signal', async () => {
    const payload = { data: [{ id: 1 }], total: 1, page: 1, limit: 15, totalPages: 1 };
    apiClient.get.mockResolvedValue({ data: payload });
    const signal = new AbortController().signal;

    const result = await auditService.list({ page: 1, limit: 15, action: 'create' }, { signal });

    expect(apiClient.get).toHaveBeenCalledWith('/audit', {
      params: { page: 1, limit: 15, action: 'create' },
      signal,
    });
    expect(result).toEqual(payload);
  });

  it('works without params or signal and preserves the paginated shape', async () => {
    apiClient.get.mockResolvedValue({
      data: { data: [], total: 0, page: 1, limit: 15, totalPages: 0 },
    });

    await expect(auditService.list()).resolves.toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 15,
      totalPages: 0,
    });
    expect(apiClient.get).toHaveBeenCalledWith('/audit', { params: undefined, signal: undefined });
  });
});
