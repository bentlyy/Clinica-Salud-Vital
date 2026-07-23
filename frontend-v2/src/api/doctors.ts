import api from './axios'

export interface Doctor {
  id: number
  name: string
  specialty: string
  email: string
  slot_duration: number
  user_id: number
}

export async function getDoctors() {
  const { data } = await api.get('/doctors')
  return data
}

export async function getPublicDoctors() {
  const { data } = await api.get('/doctors/public')
  return data
}

export async function getDoctorProfile() {
  const { data } = await api.get('/doctors/me')
  return data
}
