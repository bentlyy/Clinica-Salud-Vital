import api from './axios';

export interface ClinicalRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  diagnosis?: string;
  physical_exam?: string;
  treatment_plan?: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface Prescription {
  id: string;
  clinical_record_id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
  route?: string;
  [key: string]: unknown;
}

export interface Cie10Code {
  code: string;
  description: string;
  category?: string;
  [key: string]: unknown;
}

export const getClinicalRecords = async (params: Record<string, unknown> = {}, options: Record<string, unknown> = {}): Promise<ClinicalRecord[]> => {
  const res = await api.get('/clinical-records', { ...options, params });
  return res.data;
};

export const getClinicalRecordById = async (id: string, options: Record<string, unknown> = {}): Promise<ClinicalRecord> => {
  const res = await api.get(`/clinical-records/${id}`, options);
  return res.data;
};

export const getClinicalRecordsByPatient = async (patientId: string, options: Record<string, unknown> = {}): Promise<ClinicalRecord[]> => {
  const res = await api.get(`/clinical-records/patient/${patientId}`, options);
  return res.data;
};

export const createClinicalRecord = async (data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<ClinicalRecord> => {
  const res = await api.post('/clinical-records', data, options);
  return res.data;
};

export const updateClinicalRecord = async (id: string, data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<ClinicalRecord> => {
  const res = await api.put(`/clinical-records/${id}`, data, options);
  return res.data;
};

export const deleteClinicalRecord = async (id: string, options: Record<string, unknown> = {}): Promise<void> => {
  const res = await api.delete(`/clinical-records/${id}`, options);
  return res.data;
};

export const searchCie10 = async (query: string, options: Record<string, unknown> = {}): Promise<Cie10Code[]> => {
  const res = await api.get('/clinical-records/cie10/search', { ...options, params: { q: query } });
  return res.data;
};

export const getCie10Categories = async (options: Record<string, unknown> = {}): Promise<Cie10Code[]> => {
  const res = await api.get('/clinical-records/cie10/categories', options);
  return res.data;
};

export const createPrescription = async (data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<Prescription> => {
  const res = await api.post('/clinical-records/prescriptions', data, options);
  return res.data;
};

export const updatePrescription = async (id: string, data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<Prescription> => {
  const res = await api.put(`/clinical-records/prescriptions/${id}`, data, options);
  return res.data;
};

export const deletePrescription = async (id: string, options: Record<string, unknown> = {}): Promise<void> => {
  const res = await api.delete(`/clinical-records/prescriptions/${id}`, options);
  return res.data;
};

export const getPrescriptionsByRecord = async (recordId: string, options: Record<string, unknown> = {}): Promise<Prescription[]> => {
  const res = await api.get(`/clinical-records/${recordId}/prescriptions`, options);
  return res.data;
};
