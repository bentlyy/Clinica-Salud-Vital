import api from './axios';

export const getAvailableSlots = async (doctorId, date) => {
  const res = await api.get(
    `/bookings/available-slots?doctor_id=${doctorId}&date=${date}`
  );
  return res.data;
};

export const createBooking = async (data) => {
  const res = await api.post('/bookings', data);
  return res.data;
};

export const createGuestBooking = async (data) => {
  const res = await api.post('/guest/booking', data);
  return res.data;
};

export const getMyBookings = async () => {
  const res = await api.get('/bookings/me');
  return res.data;
};

export const getGuestBookings = async (rut) => {
  const res = await api.get(`/guest/bookings/${rut}`);
  return res.data;
};

export const deleteBooking = async (id) => {
  const res = await api.delete(`/bookings/${id}`);
  return res.data;
};

export const confirmBooking = async (token) => {
  const res = await api.post('/confirmation/confirm', { token });
  return res.data;
};
