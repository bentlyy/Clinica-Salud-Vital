import api from './axios';

export const getAvailability = async () => {
  const res = await api.get('/availability/me');
  return res.data;
};

export const createAvailability = async (data) => {
  const res = await api.post('/availability', data);
  return res.data;
};

export const deleteAvailability = async (id) => {
  const res = await api.delete(`/availability/${id}`);
  return res.data;
};