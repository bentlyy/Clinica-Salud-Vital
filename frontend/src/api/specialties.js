import api from './axios';

export const getSpecialties = async (options = {}) => {
  const res = await api.get('/specialties', options);
  return res.data;
};

export const getSpecialtyById = async (id) => {
  const res = await api.get(`/specialties/${id}`);
  return res.data;
};

export const createSpecialty = async (data) => {
  const res = await api.post('/specialties', data);
  return res.data;
};

export const updateSpecialty = async (id, data) => {
  const res = await api.put(`/specialties/${id}`, data);
  return res.data;
};

export const deleteSpecialty = async (id) => {
  const res = await api.delete(`/specialties/${id}`);
  return res.data;
};
