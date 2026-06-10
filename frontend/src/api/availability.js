import api from './axios';

export const getAvailability = async (options = {}) => {
  const res = await api.get('/availability/me', options);
  return res.data;
};

export const createAvailability = async (data, options = {}) => {
  const res = await api.post('/availability', data, options);
  return res.data;
};

export const deleteAvailability = async (id, options = {}) => {
  const res = await api.delete(`/availability/${id}`, options);
  return res.data;
};
