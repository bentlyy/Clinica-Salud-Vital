import api from './axios'

export interface Tenant {
  id: string
  name: string
  domain: string
  active: boolean
  created_at: string
  config: Record<string, unknown>
}

export async function getSuperAdminStats() {
  const { data } = await api.get('/super-admin/stats')
  return data
}

export async function getTenants() {
  const { data } = await api.get('/super-admin/tenants')
  return data
}

export async function getTenant(id: string) {
  const { data } = await api.get(`/super-admin/tenants/${id}`)
  return data
}

export async function createTenant(tenant: Partial<Tenant>) {
  const { data } = await api.post('/super-admin/tenants', tenant)
  return data
}

export async function updateTenant(id: string, tenant: Partial<Tenant>) {
  const { data } = await api.patch(`/super-admin/tenants/${id}`, tenant)
  return data
}

export async function deleteTenant(id: string) {
  const { data } = await api.delete(`/super-admin/tenants/${id}`)
  return data
}

export async function getUsers() {
  const { data } = await api.get('/super-admin/users')
  return data
}

export async function toggleUserActive(userId: number) {
  const { data } = await api.patch(`/super-admin/users/${userId}/active`)
  return data
}

export async function getGlobalAnalytics() {
  const { data } = await api.get('/super-admin/analytics/dashboard')
  return data
}
