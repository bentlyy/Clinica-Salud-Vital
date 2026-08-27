import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type {
  Tenant,
  CreateTenantInput,
  UpdateTenantInput,
  TenantListParams,
  TenantDetail,
  SaasDashboard,
  HealthScore,
  SaasAlert,
} from '../types/super-admin.types';

export const superAdminService = {
  async getStats(opts?: { signal?: AbortSignal }) {
    const { data } = await apiClient.get('/super-admin/stats', { signal: opts?.signal });
    return data;
  },

  async getDashboardData(opts?: { signal?: AbortSignal }): Promise<SaasDashboard> {
    const [dashRes, growthRes] = await Promise.all([
      apiClient.get<{ data: Record<string, unknown> }>('/super-admin/analytics/dashboard', { signal: opts?.signal }),
      apiClient.get<{ data: Array<{ month: string; new_tenants: number }> }>('/super-admin/analytics/growth', { signal: opts?.signal }),
    ]);

    const raw = dashRes.data.data;

    const tenants_by_plan: SaasDashboard['tenants_by_plan'] = Array.isArray(raw.planDistribution)
      ? raw.planDistribution.map((p: { plan: string; count: string | number }) => ({
          plan: p.plan,
          count: Number(p.count),
        }))
      : [];

    const growthRaw = growthRes.data.data || [];
    const growth_by_month: SaasDashboard['growth_by_month'] = growthRaw.map(
      (g: { month: string; new_tenants: number }) => ({
        month: g.month,
        tenants: g.new_tenants || 0,
        revenue: 0,
      }),
    );

    return {
      total_tenants: Number(raw.total_tenants || 0),
      active_tenants: Number(raw.active_tenants || 0),
      total_users: Number(raw.total_users || 0),
      total_revenue: Number(raw.total_revenue || 0),
      tenants_by_plan,
      growth_by_month,
    };
  },

  async listTenants(params: TenantListParams = {}, opts?: { signal?: AbortSignal }): Promise<PaginatedResponse<Tenant>> {
    const { data } = await apiClient.get<{
      data: Tenant[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(
      '/super-admin/tenants',
      { params, signal: opts?.signal },
    );
    const pagination = data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };
    return {
      data: data.data || [],
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: pagination.totalPages,
    };
  },

  async getTenantById(id: string, opts?: { signal?: AbortSignal }): Promise<TenantDetail> {
    const { data } = await apiClient.get<TenantDetail>(`/super-admin/tenants/${id}`, { signal: opts?.signal });
    return data;
  },

  async createTenant(input: CreateTenantInput, opts?: { signal?: AbortSignal }): Promise<Tenant> {
    const { data } = await apiClient.post<Tenant>('/super-admin/tenants', input, { signal: opts?.signal });
    return data;
  },

  async updateTenant(id: string, input: UpdateTenantInput, opts?: { signal?: AbortSignal }): Promise<Tenant> {
    const { data } = await apiClient.patch<Tenant>(`/super-admin/tenants/${id}`, input, { signal: opts?.signal });
    return data;
  },

  async deleteTenant(id: string, opts?: { signal?: AbortSignal }): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(`/super-admin/tenants/${id}`, { signal: opts?.signal });
    return data;
  },

  async getTenantStats(id: string, opts?: { signal?: AbortSignal }): Promise<TenantDetail> {
    const { data } = await apiClient.get<TenantDetail>(`/super-admin/tenants/${id}`, { signal: opts?.signal });
    return data;
  },

  async listUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    tenantId?: string;
  } = {}, opts?: { signal?: AbortSignal }): Promise<{ data: Array<{ id: number; name: string; email: string; role: string; tenant_id: string | null; active: boolean }>; pagination: { total: number; page: number; limit: number } }> {
    const { tenantId, ...rest } = params;
    const { data } = await apiClient.get('/super-admin/users', {
      params: tenantId ? { ...rest, tenant_id: tenantId } : rest,
      signal: opts?.signal,
    });
    return data;
  },

  async toggleUserActive(userId: number, active: boolean, opts?: { signal?: AbortSignal }): Promise<{ message: string }> {
    const { data } = await apiClient.patch(`/super-admin/users/${userId}/active`, { active }, { signal: opts?.signal });
    return data;
  },

  async getHealthScores(opts?: { signal?: AbortSignal }): Promise<HealthScore[]> {
    const { data } = await apiClient.get<{ data: HealthScore[] }>('/super-admin/analytics/health', {
      signal: opts?.signal,
    });
    return data.data || [];
  },

  async getAlerts(opts?: { signal?: AbortSignal }): Promise<SaasAlert[]> {
    const { data } = await apiClient.get<{ data: SaasAlert[] }>('/super-admin/analytics/alerts', {
      signal: opts?.signal,
    });
    return data.data || [];
  },

  async getBillingSummary(params: { tenantId?: string; search?: string } = {}, opts?: { signal?: AbortSignal }): Promise<{ data: Array<{
    id: string;
    name: string;
    slug: string;
    active: boolean;
    invoice_count: number;
    total_billed: number;
    total_paid: number;
    total_pending: number;
    overdue_count: number;
  }> }> {
    const { data } = await apiClient.get('/super-admin/billing', {
      params: { ...(params.tenantId ? { tenant_id: params.tenantId } : {}), ...(params.search ? { search: params.search } : {}) },
      signal: opts?.signal,
    });
    return data;
  },
};
