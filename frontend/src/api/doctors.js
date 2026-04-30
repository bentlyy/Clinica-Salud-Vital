import api from './axios';

export const getDoctors = async () => {
  const res = await api.get('/doctors/public');
  return res.data;
};

// ✅ Fixed: was '/doctor/bookings/me' which doesn't exist
export const getDoctorBookings = async () => {
  const res = await api.get('/bookings/doctor');
  return res.data;
};