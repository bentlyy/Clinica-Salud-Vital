import api from './axios';

export const getExceptions = async (options = {}) => {
  const res = await api.get('/exceptions/me', options);
  return res.data;
};

export const createException = async (data, options = {}) => {
  const res = await api.post('/exceptions', data, options);
  return res.data;
};

export const deleteException = async (id, options = {}) => {
  const res = await api.delete(`/exceptions/${id}`, options);
  return res.data;
};
