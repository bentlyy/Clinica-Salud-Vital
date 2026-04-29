import api from './axios';

export const getDoctors = async () => {
  const res = await api.get('/doctors/public');
  return res.data;
};

export const getDoctorBookings = async () => {
  const res = await api.get('/doctor/bookings/me');
  return res.data;
};