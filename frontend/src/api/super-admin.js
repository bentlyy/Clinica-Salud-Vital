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
  return { data: res.data, pagination: res.pagination };
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
