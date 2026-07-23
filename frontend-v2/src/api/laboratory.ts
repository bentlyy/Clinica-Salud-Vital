import api from './axios'

export interface LabRequest {
  id: number
  patient_name: string
  doctor_name: string
  status: string
  created_at: string
  items_count: number
}

export interface LabSample {
  id: number
  barcode: string
  status: string
  area_name: string
  created_at: string
  patient_name?: string
  doctor_name?: string
  items_count?: number
}

export async function getLabDashboard() {
  const { data } = await api.get('/laboratory/dashboard')
  return data
}

export async function getLabRequests() {
  const { data } = await api.get('/laboratory')
  return data
}

export async function getLabRequest(id: number) {
  const { data } = await api.get(`/laboratory/${id}`)
  return data
}

export async function getLabSamples() {
  const { data } = await api.get('/laboratory/samples')
  return data
}

export async function getLabAreas() {
  const { data } = await api.get('/laboratory/areas')
  return data
}

export async function getLabEquipment() {
  const { data } = await api.get('/laboratory/equipment')
  return data
}

export async function getLabQC() {
  const { data } = await api.get('/laboratory/qc')
  return data
}

export async function getLabAnalytics() {
  const { data } = await api.get('/laboratory/dashboard/analytics')
  return data
}
