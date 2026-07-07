import api from './axios';

export interface Exception {
  id: string;
  doctor_id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
  [key: string]: unknown;
}

export const getExceptions = async (options: Record<string, unknown> = {}): Promise<Exception[]> => {
  const res = await api.get('/exceptions/me', options);
  return res.data;
};

export const createException = async (data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<Exception> => {
  const res = await api.post('/exceptions', data, options);
  return res.data;
};

export const deleteException = async (id: string, options: Record<string, unknown> = {}): Promise<void> => {
  const res = await api.delete(`/exceptions/${id}`, options);
  return res.data;
};
