import api from './axios';

export const getDoctorBookings = async () => {
  const res = await api.get('/bookings/doctor');
  return res.data;
};