import api from './axios'

export interface Booking {
  id: number
  doctor_id: number
  user_id: number | null
  date: string
  time: string
  duration: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  doctor_name?: string
  patient_name?: string
  specialty?: string
  created_at: string
}

export async function getMyBookings() {
  const { data } = await api.get('/bookings/me')
  return data
}

export async function getDoctorBookings() {
  const { data } = await api.get('/bookings/doctor')
  return data
}

export async function getAllBookings() {
  const { data } = await api.get('/bookings/all')
  return data
}

export async function getAvailableSlots(doctorId: number, date: string) {
  const { data } = await api.get('/bookings/available-slots', { params: { doctor_id: doctorId, date } })
  return data
}

export async function cancelBooking(id: number) {
  const { data } = await api.patch(`/bookings/${id}/cancel`)
  return data
}
