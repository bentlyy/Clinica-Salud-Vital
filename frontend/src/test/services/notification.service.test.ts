import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import { notificationService } from '@/modules/notifications/services/notification.service';

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('calls GET /notifications with the paging params', async () => {
      apiClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      const result = await notificationService.list({ page: 2, limit: 10 });

      expect(apiClient.get).toHaveBeenCalledWith('/notifications', {
        params: { page: 2, limit: 10 },
        signal: undefined,
      });
      expect(result).toEqual({ data: [], total: 0 });
    });

    it('adds tenant_id to the params when tenantId is provided', async () => {
      apiClient.get.mockResolvedValue({ data: [] });

      await notificationService.list({ page: 1, limit: 5, tenantId: 'tenant-9' });

      expect(apiClient.get).toHaveBeenCalledWith('/notifications', {
        params: { page: 1, limit: 5, tenant_id: 'tenant-9' },
        signal: undefined,
      });
    });

    it('does not leak tenant_id into the payload when absent', async () => {
      apiClient.get.mockResolvedValue({ data: [] });

      await notificationService.list();

      expect(apiClient.get).toHaveBeenCalledWith('/notifications', {
        params: {},
        signal: undefined,
      });
    });
  });

  describe('markAsRead', () => {
    it('patches the read endpoint with an undefined body', async () => {
      apiClient.patch.mockResolvedValue({ data: { ok: true } });

      const result = await notificationService.markAsRead(42);

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/notifications/42/read',
        undefined,
        { signal: undefined },
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('markAllAsRead', () => {
    it('patches the read-all endpoint', async () => {
      apiClient.patch.mockResolvedValue({ data: { ok: true } });

      const result = await notificationService.markAllAsRead();

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/notifications/read-all',
        undefined,
        { signal: undefined },
      );
      expect(result).toEqual({ ok: true });
    });
  });
});
