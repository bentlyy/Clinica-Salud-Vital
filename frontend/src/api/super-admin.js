import api from './axios';

export const getGlobalStats = async () => {
  const res = await api.get('/super-admin/stats');
  return res.data;
};

export const listTenants = async (page = 1, limit = 20, filters = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (filters.active !== undefined) params.set('active', filters.active);
  if (filters.search) params.set('search', filters.search);
  const res = await api.get(`/super-admin/tenants?${params}`);
  return res.data;
};

export const getTenantDetail = async (id) => {
  const res = await api.get(`/super-admin/tenants/${id}`);
  return res.data;
};

export const adminCreateTenant = async (data) => {
  const res = await api.post('/super-admin/tenants', data);
  return res.data;
};

export const updateTenant = async (id, data) => {
  const res = await api.patch(`/super-admin/tenants/${id}`, data);
  return res.data;
};

export const deleteTenant = async (id) => {
  await api.delete(`/super-admin/tenants/${id}`);
};
