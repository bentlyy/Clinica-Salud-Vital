import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type {
  Tenant,
  CreateTenantInput,
  UpdateTenantInput,
  TenantListParams,
  TenantStats,
} from '../types/super-admin.types';

export const superAdminService = {
  async getStats() {
    const { data } = await apiClient.get('/super-admin/stats');
    return data;
  },

  async getDashboardData() {
    const { data } = await apiClient.get('/super-admin/analytics/dashboard');
    return data;
  },

  async listTenants(params: TenantListParams = {}): Promise<PaginatedResponse<Tenant>> {
    const { data } = await apiClient.get<PaginatedResponse<Tenant>>('/super-admin/tenants', { params });
    return data;
  },

  async getTenantById(id: number): Promise<Tenant> {
    const { data } = await apiClient.get<Tenant>(`/super-admin/tenants/${id}`);
    return data;
  },

  async createTenant(input: CreateTenantInput): Promise<Tenant> {
    const { data } = await apiClient.post<Tenant>('/super-admin/tenants', input);
    return data;
  },

  async updateTenant(id: number, input: UpdateTenantInput): Promise<Tenant> {
    const { data } = await apiClient.patch<Tenant>(`/super-admin/tenants/${id}`, input);
    return data;
  },

  async deleteTenant(id: number): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(`/super-admin/tenants/${id}`);
    return data;
  },

  async getTenantStats(id: number): Promise<TenantStats> {
    const { data } = await apiClient.get<TenantStats>(`/super-admin/tenants/${id}`);
    return data;
  },
};
