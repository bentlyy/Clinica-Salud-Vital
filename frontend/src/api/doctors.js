import api from './axios';

export const getDoctors = async (options = {}) => {
  const res = await api.get('/doctors/public', options);
  return res.data;
};

export const getDoctorBookings = async (options = {}) => {
  const res = await api.get('/bookings/doctor', options);
  return res.data;
};
