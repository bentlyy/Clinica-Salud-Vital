import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type {
  Tenant,
  CreateTenantInput,
  UpdateTenantInput,
  TenantListParams,
  TenantDetail,
  SaasDashboard,
} from '../types/super-admin.types';

export const superAdminService = {
  async getStats() {
    const { data } = await apiClient.get('/super-admin/stats');
    return data;
  },

  async getDashboardData(): Promise<SaasDashboard> {
    const [dashRes, growthRes] = await Promise.all([
      apiClient.get<{ data: Record<string, unknown> }>('/super-admin/analytics/dashboard'),
      apiClient.get<{ data: Array<{ month: string; new_tenants: number }> }>('/super-admin/analytics/growth'),
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

  async listTenants(params: TenantListParams = {}): Promise<PaginatedResponse<Tenant>> {
    const { data } = await apiClient.get<{ data: Tenant[]; total: number; page: number; limit: number; totalPages: number }>(
      '/super-admin/tenants',
      { params },
    );
    return {
      data: data.data || [],
      total: data.total || 0,
      page: data.page || 1,
      limit: data.limit || 20,
      totalPages: data.totalPages || 1,
    };
  },

  async getTenantById(id: string): Promise<TenantDetail> {
    const { data } = await apiClient.get<TenantDetail>(`/super-admin/tenants/${id}`);
    return data;
  },

  async createTenant(input: CreateTenantInput): Promise<Tenant> {
    const { data } = await apiClient.post<Tenant>('/super-admin/tenants', input);
    return data;
  },

  async updateTenant(id: string, input: UpdateTenantInput): Promise<Tenant> {
    const { data } = await apiClient.patch<Tenant>(`/super-admin/tenants/${id}`, input);
    return data;
  },

  async deleteTenant(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(`/super-admin/tenants/${id}`);
    return data;
  },

  async getTenantStats(id: string): Promise<TenantDetail> {
    const { data } = await apiClient.get<TenantDetail>(`/super-admin/tenants/${id}`);
    return data;
  },

  async listUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    tenantId?: string;
  } = {}): Promise<{ data: Array<{ id: number; name: string; email: string; role: string; tenant_id: string | null; active: boolean }>; pagination: { total: number; page: number; limit: number } }> {
    const { data } = await apiClient.get('/super-admin/users', { params });
    return data;
  },

  async toggleUserActive(userId: number, active: boolean): Promise<{ message: string }> {
    const { data } = await apiClient.patch(`/super-admin/users/${userId}/toggle-active`, { active });
    return data;
  },
};
