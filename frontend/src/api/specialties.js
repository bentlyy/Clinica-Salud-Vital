import api from './axios';

export const getSpecialties = async (options = {}) => {
  const res = await api.get('/specialties', options);
  return res.data;
};
