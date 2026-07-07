import api from './axios';

export interface LabTest {
  id: string;
  name: string;
  category?: string;
  unit?: string;
  price?: number;
  active?: boolean;
  [key: string]: unknown;
}

export interface LabRequest {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinical_record_id?: string;
  status?: string;
  notes?: string;
  created_at?: string;
  items?: LabRequestItem[];
  [key: string]: unknown;
}

export interface LabRequestItem {
  id: string;
  test_id: string;
  test_name?: string;
  result_value?: string;
  result_notes?: string;
  reference_range?: string;
  [key: string]: unknown;
}

export const getLabTests = async (params: Record<string, unknown> = {}, options: Record<string, unknown> = {}): Promise<LabTest[]> => {
  const res = await api.get('/laboratory/tests', { params, signal: options.signal as AbortSignal });
  return res.data;
};

export const getLabRequests = async (params: Record<string, unknown> = {}, options: Record<string, unknown> = {}): Promise<LabRequest[]> => {
  const res = await api.get('/laboratory', { params, signal: options.signal as AbortSignal });
  return res.data;
};

export const getLabRequestById = async (id: string, options: Record<string, unknown> = {}): Promise<LabRequest> => {
  const res = await api.get(`/laboratory/${id}`, { signal: options.signal as AbortSignal });
  return res.data;
};

export const createLabRequest = async (data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<LabRequest> => {
  const res = await api.post('/laboratory', data, { signal: options.signal as AbortSignal });
  return res.data;
};

export const updateLabRequest = async (id: string, data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<LabRequest> => {
  const res = await api.put(`/laboratory/${id}`, data, { signal: options.signal as AbortSignal });
  return res.data;
};

export const deleteLabRequest = async (id: string, options: Record<string, unknown> = {}): Promise<void> => {
  const res = await api.delete(`/laboratory/${id}`, { signal: options.signal as AbortSignal });
  return res.data;
};

export const addLabResult = async (id: string, data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<LabRequest> => {
  const res = await api.post(`/laboratory/${id}/results`, data, { signal: options.signal as AbortSignal });
  return res.data;
};

export const updateLabResultItem = async (id: string, itemId: string, data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<LabRequest> => {
  const res = await api.put(`/laboratory/${id}/results/${itemId}`, data, { signal: options.signal as AbortSignal });
  return res.data;
};

export const downloadLabOrderPdf = async (id: string, options: Record<string, unknown> = {}): Promise<Blob> => {
  const res = await api.get(`/laboratory/${id}/pdf`, { responseType: 'blob', signal: options.signal as AbortSignal });
  return res.data;
};

export const getLabResultsByClinicalRecord = async (clinicalRecordId: string, options: Record<string, unknown> = {}): Promise<LabRequest[]> => {
  const res = await api.get(`/clinical-records/${clinicalRecordId}/lab-results`, { signal: options.signal as AbortSignal });
  return res.data;
};

export const createLabTest = async (data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<LabTest> => {
  const res = await api.post('/laboratory/tests', data, { signal: options.signal as AbortSignal });
  return res.data;
};

export const updateLabTest = async (id: string, data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<LabTest> => {
  const res = await api.put(`/laboratory/tests/${id}`, data, { signal: options.signal as AbortSignal });
  return res.data;
};

export const deleteLabTest = async (id: string, options: Record<string, unknown> = {}): Promise<void> => {
  const res = await api.delete(`/laboratory/tests/${id}`, { signal: options.signal as AbortSignal });
  return res.data;
};
