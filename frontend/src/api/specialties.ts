import api from './axios';

export interface Specialty {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  description?: string;
  department?: string;
  procedures?: string[];
  [key: string]: unknown;
}

export const getSpecialties = async (options: Record<string, unknown> = {}): Promise<Specialty[]> => {
  const res = await api.get('/specialties', options);
  return res.data;
};

export const getSpecialtyById = async (id: string): Promise<Specialty> => {
  const res = await api.get(`/specialties/${id}`);
  return res.data;
};

export const createSpecialty = async (data: Record<string, unknown>): Promise<Specialty> => {
  const res = await api.post('/specialties', data);
  return res.data;
};

export const updateSpecialty = async (id: string, data: Record<string, unknown>): Promise<Specialty> => {
  const res = await api.put(`/specialties/${id}`, data);
  return res.data;
};

export const deleteSpecialty = async (id: string): Promise<void> => {
  const res = await api.delete(`/specialties/${id}`);
  return res.data;
};
