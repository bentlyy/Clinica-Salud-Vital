import api from './axios';

export interface Availability {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  [key: string]: unknown;
}

export const getAvailability = async (options: Record<string, unknown> = {}): Promise<Availability[]> => {
  const res = await api.get('/availability/me', options);
  return res.data;
};

export const createAvailability = async (data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<Availability> => {
  const res = await api.post('/availability', data, options);
  return res.data;
};

export const deleteAvailability = async (id: string, options: Record<string, unknown> = {}): Promise<void> => {
  const res = await api.delete(`/availability/${id}`, options);
  return res.data;
};
