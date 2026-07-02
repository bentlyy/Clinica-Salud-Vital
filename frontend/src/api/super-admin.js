import api from './axios';

export const getGlobalStats = async (options = {}) => {
  const res = await api.get('/super-admin/stats', options);
  return res.data;
};

export const listTenants = async (page = 1, limit = 20, filters = {}, options = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (filters.active !== undefined) params.set('active', filters.active);
  if (filters.search) params.set('search', filters.search);
  const res = await api.get(`/super-admin/tenants?${params}`, options);
  const body = res.data;
  return { data: body.data ?? [], pagination: body.pagination ?? { page, limit, total: 0, totalPages: 0 } };
};

export const getTenantDetail = async (id, options = {}) => {
  const res = await api.get(`/super-admin/tenants/${id}`, options);
  return res.data;
};

export const adminCreateTenant = async (data, options = {}) => {
  const res = await api.post('/super-admin/tenants', data, options);
  return res.data;
};

export const updateTenant = async (id, data, options = {}) => {
  const res = await api.patch(`/super-admin/tenants/${id}`, data, options);
  return res.data;
};

export const deleteTenant = async (id, options = {}) => {
  await api.delete(`/super-admin/tenants/${id}`, { ...options, data: { confirm: true } });
};

export const listUsers = async (page = 1, limit = 50, filters = {}, options = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (filters.tenantId) params.set('tenant_id', filters.tenantId);
  if (filters.role) params.set('role', filters.role);
  if (filters.search) params.set('search', filters.search);
  const res = await api.get(`/super-admin/users?${params}`, options);
  const body = res.data;
  return { data: body.data ?? [], pagination: body.pagination ?? { page, limit, total: 0, totalPages: 0 } };
};

export const toggleUserActive = async (userId, active, options = {}) => {
  const res = await api.patch(`/super-admin/users/${userId}/active`, { active }, options);
  return res.data;
};

export const getDashboardAnalytics = async (options = {}) => {
  const res = await api.get('/super-admin/analytics/dashboard', options);
  return res.data;
};

export const getTopTenants = async (limit = 10, metric = 'bookings', options = {}) => {
  const res = await api.get(`/super-admin/analytics/top-tenants?limit=${limit}&metric=${metric}`, options);
  return res.data;
};

export const getRevenueAnalytics = async (months = 12, options = {}) => {
  const res = await api.get(`/super-admin/analytics/revenue?months=${months}`, options);
  return res.data;
};

export const getGrowthAnalytics = async (months = 12, options = {}) => {
  const res = await api.get(`/super-admin/analytics/growth?months=${months}`, options);
  return res.data;
};

export const getTenantGrowthAnalytics = async (tenantId, months = 12, options = {}) => {
  const res = await api.get(`/super-admin/analytics/tenant-growth/${encodeURIComponent(tenantId)}?months=${months}`, options);
  return res.data;
};

export const getHealthScores = async (options = {}) => {
  const res = await api.get('/super-admin/analytics/health', options);
  return res.data;
};

export const getHealthScoreDetail = async (tenantId, options = {}) => {
  const res = await api.get(`/super-admin/analytics/health/${encodeURIComponent(tenantId)}`, options);
  return res.data;
};

export const getOperations = async (months = 6, options = {}) => {
  const res = await api.get(`/super-admin/analytics/operations?months=${months}`, options);
  return res.data;
};

export const getChurn = async (months = 12, options = {}) => {
  const res = await api.get(`/super-admin/analytics/churn?months=${months}`, options);
  return res.data;
};

export const getComparison = async (options = {}) => {
  const res = await api.get('/super-admin/analytics/comparison', options);
  return res.data;
};

export const getOccupancy = async (options = {}) => {
  const res = await api.get('/super-admin/analytics/occupancy', options);
  return res.data;
};

export const getActivity = async (options = {}) => {
  const res = await api.get('/super-admin/analytics/activity', options);
  return res.data;
};

export const getAlerts = async (options = {}) => {
  const res = await api.get('/super-admin/analytics/alerts', options);
  return res.data;
};
