import api from './axios';

export const getExceptions = async () => {
  const res = await api.get('/exceptions/me');
  return res.data;
};

export const createException = async (data) => {
  const res = await api.post('/exceptions', data);
  return res.data;
};

export const deleteException = async (id) => {
  const res = await api.delete(`/exceptions/${id}`);
  return res.data;
};