import api from './axios'

export interface DashboardStats {
  totalDoctors?: number
  totalPatients?: number
  todayBookings?: number
  monthRevenue?: number
  totalTenants?: number
  mrr?: number
  totalUsers?: number
  uptime?: string
}

export async function getDashboardStats() {
  const { data } = await api.get<DashboardStats>('/analytics/dashboard')
  return data
}

export async function getBookingsByMonth() {
  const { data } = await api.get('/analytics/bookings-by-month')
  return data
}

export async function getTopDoctors() {
  const { data } = await api.get('/analytics/top-doctors')
  return data
}

export async function getStatusDistribution() {
  const { data } = await api.get('/analytics/status-distribution')
  return data
}

export async function getMyStats() {
  const { data } = await api.get('/analytics/my-stats')
  return data
}
