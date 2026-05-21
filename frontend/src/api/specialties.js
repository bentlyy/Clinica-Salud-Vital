import api from './axios';

export const getSpecialties = async () => {
  const res = await api.get('/specialties');
  return res.data;
};
