import api from './axios'

export interface AuthUser {
  id: number
  email: string
  role: UserRole
  name: string
  rut: string
  phone: string
  tenant_id: string
}

export type UserRole = 'superadmin' | 'admin' | 'doctor' | 'lab_technician' | 'patient' | 'guest' | 'user'

export interface LoginResponse {
  user: AuthUser
  tenant_id: string
}

export interface LoginError {
  error: string
  code?: string
}

export async function login(email: string, password: string, totpToken?: string) {
  const body: Record<string, string> = { email, password }
  if (totpToken) body.totp_token = totpToken
  const { data } = await api.post<LoginResponse>('/auth/login', body)
  return data
}

export async function register(userData: {
  email: string
  password: string
  name: string
  rut: string
  phone: string
  tenant_id?: string
  invite_token?: string
}) {
  const { data } = await api.post<LoginResponse>('/auth/register', userData)
  return data
}

export async function logout() {
  await api.post('/auth/logout')
}

export async function forgotPassword(email: string) {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

export async function resetPassword(token: string, password: string) {
  const { data } = await api.post('/auth/reset-password', { token, password })
  return data
}

export async function enable2FA() {
  const { data } = await api.post('/auth/2fa/enable')
  return data
}

export async function verify2FA(token: string) {
  const { data } = await api.post('/auth/2fa/verify', { token })
  return data
}

export async function disable2FA(password: string, token: string) {
  const { data } = await api.post('/auth/2fa/disable', { password, token })
  return data
}

export async function getProfile() {
  const { data } = await api.get('/auth/me')
  return data
}
