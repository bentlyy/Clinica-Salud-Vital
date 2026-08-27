import { describe, it, expect, vi, beforeEach } from 'vitest';
import { superAdminService } from '@/modules/super-admin/services/super-admin.service';
import { apiClient } from '@/shared/services/api-client';

vi.mock('@/shared/services/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(apiClient);

const tenant = {
  id: 't1',
  name: 'Clínica Norte',
  slug: 'clinica-norte',
  domain: 'norte.clinic.com',
  active: true,
  plan: 'pro',
  total_bookings: 12,
  total_users: 5,
  total_doctors: 2,
  created_at: '2026-01-01T00:00:00Z',
};

describe('superAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStats', () => {
    it('calls GET /super-admin/stats and returns the payload', async () => {
      const stats = { tenants: 4, active_tenants: 3 };
      mockedApi.get.mockResolvedValue({ data: stats });
      await expect(superAdminService.getStats()).resolves.toEqual(stats);
      expect(mockedApi.get).toHaveBeenCalledWith('/super-admin/stats', { signal: undefined });
    });

    it('forwards the abort signal', async () => {
      mockedApi.get.mockResolvedValue({ data: {} });
      const signal = new AbortController().signal;
      await superAdminService.getStats({ signal });
      expect(mockedApi.get).toHaveBeenCalledWith('/super-admin/stats', { signal });
    });
  });

  describe('getDashboardData', () => {
    it('fetches dashboard and growth in parallel and maps planDistribution/new_tenants', async () => {
      mockedApi.get
        .mockResolvedValueOnce({
          data: {
            data: {
              total_tenants: '10',
              active_tenants: 7,
              total_users: 42,
              total_revenue: '9999.5',
              planDistribution: [
                { plan: 'free', count: '4' },
                { plan: 'pro', count: 6 },
              ],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: [
              { month: '2026-05', new_tenants: 3 },
              { month: '2026-06', new_tenants: 0 },
            ],
          },
        });

      const result = await superAdminService.getDashboardData();

      expect(mockedApi.get).toHaveBeenCalledWith('/super-admin/analytics/dashboard', { signal: undefined });
      expect(mockedApi.get).toHaveBeenCalledWith('/super-admin/analytics/growth', { signal: undefined });
      expect(result).toEqual({
        total_tenants: 10,
        active_tenants: 7,
        total_users: 42,
        total_revenue: 9999.5,
        tenants_by_plan: [
          { plan: 'free', count: 4 },
          { plan: 'pro', count: 6 },
        ],
        growth_by_month: [
          { month: '2026-05', tenants: 3, revenue: 0 },
          { month: '2026-06', tenants: 0, revenue: 0 },
        ],
      });
    });

    it('falls back to empty arrays when mappings are missing', async () => {
      mockedApi.get
        .mockResolvedValueOnce({ data: { data: {} } })
        .mockResolvedValueOnce({ data: { data: [] } });
      const result = await superAdminService.getDashboardData();
      expect(result).toEqual({
        total_tenants: 0,
        active_tenants: 0,
        total_users: 0,
        total_revenue: 0,
        tenants_by_plan: [],
        growth_by_month: [],
      });
    });
  });

  describe('listTenants', () => {
    it('calls GET /super-admin/tenants with params and returns normalized rows', async () => {
      mockedApi.get.mockResolvedValue({
        data: { data: [tenant], pagination: { total: 25, page: 2, limit: 10, totalPages: 3 } },
      });
      const result = await superAdminService.listTenants({ page: 2, limit: 10, search: 'norte' });
      expect(mockedApi.get).toHaveBeenCalledWith('/super-admin/tenants', {
        params: { page: 2, limit: 10, search: 'norte' },
        signal: undefined,
      });
      expect(result).toEqual({ data: [tenant], total: 25, page: 2, limit: 10, totalPages: 3 });
    });

    it('applies defaults when pagination is missing', async () => {
      mockedApi.get.mockResolvedValue({ data: { data: [] } });
      const result = await superAdminService.listTenants();
      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    });
  });

  describe('getTenantById', () => {
    it('calls GET /super-admin/tenants/:id and returns the tenant detail', async () => {
      const detail = { ...tenant, plan_name: 'Pro', locale: 'es', timezone: 'America/Santiago' };
      mockedApi.get.mockResolvedValue({ data: detail });
      await expect(superAdminService.getTenantById('t1')).resolves.toEqual(detail);
      expect(mockedApi.get).toHaveBeenCalledWith('/super-admin/tenants/t1', { signal: undefined });
    });
  });

  describe('getTenantStats', () => {
    it('calls GET /super-admin/tenants/:id (same endpoint as detail)', async () => {
      mockedApi.get.mockResolvedValue({ data: { id: 't1', name: 'X' } });
      await superAdminService.getTenantStats('t1');
      expect(mockedApi.get).toHaveBeenCalledWith('/super-admin/tenants/t1', { signal: undefined });
    });
  });

  describe('createTenant', () => {
    it('POSTs /super-admin/tenants with the input and returns the created tenant', async () => {
      const input = { name: 'Clínica Sur', domain: 'sur.clinic.com', plan: 'basic' };
      mockedApi.post.mockResolvedValue({ data: tenant });
      await expect(superAdminService.createTenant(input)).resolves.toEqual(tenant);
      expect(mockedApi.post).toHaveBeenCalledWith('/super-admin/tenants', input, { signal: undefined });
    });
  });

  describe('updateTenant', () => {
    it('PATCHes /super-admin/tenants/:id with the input', async () => {
      const input = { name: 'Clínica Norte 2', active: false };
      mockedApi.patch.mockResolvedValue({ data: { ...tenant, ...input } });
      await superAdminService.updateTenant('t1', input);
      expect(mockedApi.patch).toHaveBeenCalledWith('/super-admin/tenants/t1', input, { signal: undefined });
    });
  });

  describe('deleteTenant', () => {
    it('DELETEs /super-admin/tenants/:id and returns the message', async () => {
      mockedApi.delete.mockResolvedValue({ data: { message: 'Tenant eliminado' } });
      const result = await superAdminService.deleteTenant('t1');
      expect(mockedApi.delete).toHaveBeenCalledWith('/super-admin/tenants/t1', { signal: undefined });
      expect(result).toEqual({ message: 'Tenant eliminado' });
    });
  });

  describe('listUsers', () => {
    it('calls GET /super-admin/users with page/limit/search params', async () => {
      const payload = { data: [{ id: 1, name: 'Ana', email: 'a@c.cl', role: 'doctor', tenant_id: 't1', active: true }], pagination: { total: 1, page: 1, limit: 10 } };
      mockedApi.get.mockResolvedValue({ data: payload });
      const result = await superAdminService.listUsers({ page: 1, limit: 10, search: 'ana' });
      expect(mockedApi.get).toHaveBeenCalledWith('/super-admin/users', {
        params: { page: 1, limit: 10, search: 'ana' },
        signal: undefined,
      });
      expect(result).toEqual(payload);
    });

    it('maps tenantId to tenant_id in the params', async () => {
      mockedApi.get.mockResolvedValue({ data: { data: [], pagination: {} } });
      await superAdminService.listUsers({ tenantId: 't1', role: 'doctor' });
      expect(mockedApi.get).toHaveBeenCalledWith('/super-admin/users', {
        params: { role: 'doctor', tenant_id: 't1' },
        signal: undefined,
      });
    });
  });

  describe('toggleUserActive', () => {
    it('PATCHes /super-admin/users/:id/active with the active flag', async () => {
      mockedApi.patch.mockResolvedValue({ data: { message: 'ok' } });
      await superAdminService.toggleUserActive(7, false);
      expect(mockedApi.patch).toHaveBeenCalledWith('/super-admin/users/7/active', { active: false }, { signal: undefined });
    });
  });

  describe('getHealthScores', () => {
    it('calls GET /super-admin/analytics/health and returns the inner array', async () => {
      const scores = [{ id: 't1', name: 'Clínica Norte', active: true, health_score: 85 }];
      mockedApi.get.mockResolvedValue({ data: { data: scores } });
      await expect(superAdminService.getHealthScores()).resolves.toEqual(scores);
      expect(mockedApi.get).toHaveBeenCalledWith('/super-admin/analytics/health', { signal: undefined });
    });

    it('falls back to an empty array when data is missing', async () => {
      mockedApi.get.mockResolvedValue({ data: {} });
      await expect(superAdminService.getHealthScores()).resolves.toEqual([]);
    });
  });

  describe('getAlerts', () => {
    it('calls GET /super-admin/analytics/alerts and returns the inner array', async () => {
      const alerts = [{ tenant_id: 't1', tenant_name: 'X', type: 'churn', severity: 'high', message: 'm' }];
      mockedApi.get.mockResolvedValue({ data: { data: alerts } });
      await expect(superAdminService.getAlerts()).resolves.toEqual(alerts);
      expect(mockedApi.get).toHaveBeenCalledWith('/super-admin/analytics/alerts', { signal: undefined });
    });
  });

  describe('getBillingSummary', () => {
    it('calls GET /super-admin/billing with tenant_id/search params', async () => {
      const payload = {
        data: [{ id: 't1', name: 'X', slug: 'x', active: true, invoice_count: 2, total_billed: 100, total_paid: 50, total_pending: 50, overdue_count: 1 }],
      };
      mockedApi.get.mockResolvedValue({ data: payload });
      const result = await superAdminService.getBillingSummary({ tenantId: 't1', search: 'x' });
      expect(mockedApi.get).toHaveBeenCalledWith('/super-admin/billing', {
        params: { tenant_id: 't1', search: 'x' },
        signal: undefined,
      });
      expect(result).toEqual(payload);
    });

    it('omits empty params', async () => {
      mockedApi.get.mockResolvedValue({ data: { data: [] } });
      await superAdminService.getBillingSummary();
      expect(mockedApi.get).toHaveBeenCalledWith('/super-admin/billing', { params: {}, signal: undefined });
    });
  });
});
