import api from './axios';

export interface Doctor {
  id: string;
  name: string;
  specialty?: string;
  email?: string;
  phone?: string;
  rut?: string;
  [key: string]: unknown;
}

export const getDoctors = async (options: Record<string, unknown> = {}): Promise<Doctor[]> => {
  const res = await api.get('/doctors/public', options);
  return res.data;
};

export const getDoctorBookings = async (options: Record<string, unknown> = {}): Promise<unknown> => {
  const res = await api.get('/bookings/doctor', options);
  return res.data;
};
