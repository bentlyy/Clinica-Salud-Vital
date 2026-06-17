import api from './axios';

export const getAvailableSlots = async (doctorId, date, options = {}) => {
  const res = await api.get(
    `/bookings/available-slots?doctor_id=${doctorId}&date=${date}`, options
  );
  return res.data;
};

export const createBooking = async (data, options = {}) => {
  const res = await api.post('/bookings', data, options);
  return res.data;
};

export const getAllBookings = async (params = {}, options = {}) => {
  const res = await api.get('/bookings/all', { ...options, params });
  return res.data;
};

export const getMyBookings = async (options = {}) => {
  const res = await api.get('/bookings/me', options);
  return res.data;
};

export const deleteBooking = async (id, options = {}) => {
  const res = await api.delete(`/bookings/${id}`, options);
  return res.data;
};

export const confirmBooking = async (token, options = {}) => {
  const res = await api.post('/confirmation/confirm', { token }, options);
  return res.data;
};

export const getDailyDensity = async (start, end, options = {}) => {
  const res = await api.get(`/bookings/doctor/daily-density?start=${start}&end=${end}`, options);
  return res.data;
};
