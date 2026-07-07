import api from './axios';

export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  active?: boolean;
  plan?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface TenantListResponse {
  data: Tenant[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  active?: boolean;
  tenant_id?: string;
  [key: string]: unknown;
}

export interface UserListResponse {
  data: User[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const getGlobalStats = async (options: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
  const res = await api.get('/super-admin/stats', options);
  return res.data;
};

export const listTenants = async (page: number = 1, limit: number = 20, filters: Record<string, unknown> = {}, options: Record<string, unknown> = {}): Promise<TenantListResponse> => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters.active !== undefined) params.set('active', String(filters.active));
  if (filters.search) params.set('search', String(filters.search));
  const res = await api.get(`/super-admin/tenants?${params}`, options);
  const body = res.data as Record<string, unknown>;
  return { data: (body.data as Tenant[]) ?? [], pagination: (body.pagination as TenantListResponse['pagination']) ?? { page, limit, total: 0, totalPages: 0 } };
};

export const getTenantDetail = async (id: string, options: Record<string, unknown> = {}): Promise<Tenant> => {
  const res = await api.get(`/super-admin/tenants/${id}`, options);
  return res.data;
};

export const adminCreateTenant = async (data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<Tenant> => {
  const res = await api.post('/super-admin/tenants', data, options);
  return res.data;
};

export const updateTenant = async (id: string, data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<Tenant> => {
  const res = await api.patch(`/super-admin/tenants/${id}`, data, options);
  return res.data;
};

export const deleteTenant = async (id: string, options: Record<string, unknown> = {}): Promise<void> => {
  await api.delete(`/super-admin/tenants/${id}`, { ...options, data: { confirm: true } });
};

export const listUsers = async (page: number = 1, limit: number = 50, filters: Record<string, unknown> = {}, options: Record<string, unknown> = {}): Promise<UserListResponse> => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters.tenantId) params.set('tenant_id', String(filters.tenantId));
  if (filters.role) params.set('role', String(filters.role));
  if (filters.search) params.set('search', String(filters.search));
  const res = await api.get(`/super-admin/users?${params}`, options);
  const body = res.data as Record<string, unknown>;
  return { data: (body.data as User[]) ?? [], pagination: (body.pagination as UserListResponse['pagination']) ?? { page, limit, total: 0, totalPages: 0 } };
};

export const toggleUserActive = async (userId: string, active: boolean, options: Record<string, unknown> = {}): Promise<User> => {
  const res = await api.patch(`/super-admin/users/${userId}/active`, { active }, options);
  return res.data;
};

export const getDashboardAnalytics = async (options: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
  const res = await api.get('/super-admin/analytics/dashboard', options);
  return res.data;
};

export const getTopTenants = async (limit: number = 10, metric: string = 'bookings', options: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
  const res = await api.get(`/super-admin/analytics/top-tenants?limit=${limit}&metric=${metric}`, options);
  return res.data;
};

export const getRevenueAnalytics = async (months: number = 12, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
  const res = await api.get(`/super-admin/analytics/revenue?months=${months}`, options);
  return res.data;
};

export const getGrowthAnalytics = async (months: number = 12, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
  const res = await api.get(`/super-admin/analytics/growth?months=${months}`, options);
  return res.data;
};

export const getTenantGrowthAnalytics = async (tenantId: string, months: number = 12, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
  const res = await api.get(`/super-admin/analytics/tenant-growth/${encodeURIComponent(tenantId)}?months=${months}`, options);
  return res.data;
};

export const getHealthScores = async (options: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
  const res = await api.get('/super-admin/analytics/health', options);
  return res.data;
};

export const getHealthScoreDetail = async (tenantId: string, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
  const res = await api.get(`/super-admin/analytics/health/${encodeURIComponent(tenantId)}`, options);
  return res.data;
};

export const getOperations = async (months: number = 6, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
  const res = await api.get(`/super-admin/analytics/operations?months=${months}`, options);
  return res.data;
};

export const getChurn = async (months: number = 12, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
  const res = await api.get(`/super-admin/analytics/churn?months=${months}`, options);
  return res.data;
};

export const getComparison = async (options: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
  const res = await api.get('/super-admin/analytics/comparison', options);
  return res.data;
};

export const getOccupancy = async (options: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
  const res = await api.get('/super-admin/analytics/occupancy', options);
  return res.data;
};

export const getActivity = async (options: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
  const res = await api.get('/super-admin/analytics/activity', options);
  return res.data;
};

export const getAlerts = async (options: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
  const res = await api.get('/super-admin/analytics/alerts', options);
  return res.data;
};
