import api from './axios'

export interface ClinicalRecord {
  id: number
  patient_id: number
  doctor_id: number
  booking_id: number | null
  chief_complaint: string
  diagnosis: string
  cie10_codes: string[]
  status: string
  created_at: string
}

export async function getClinicalRecords() {
  const { data } = await api.get('/clinical-records')
  return data
}

export async function getPatientRecords(patientId: number) {
  const { data } = await api.get(`/clinical-records/patient/${patientId}`)
  return data
}

export async function getClinicalRecord(id: number) {
  const { data } = await api.get(`/clinical-records/${id}`)
  return data
}

export async function searchCIE10(query: string) {
  const { data } = await api.get('/clinical-records/cie10/search', { params: { q: query } })
  return data
}
