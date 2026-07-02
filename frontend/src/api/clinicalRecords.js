import api from './axios';

export const getClinicalRecords = async (params = {}, options = {}) => {
  const res = await api.get('/clinical-records', { ...options, params });
  return res.data;
};

export const getClinicalRecordById = async (id, options = {}) => {
  const res = await api.get(`/clinical-records/${id}`, options);
  return res.data;
};

export const getClinicalRecordsByPatient = async (patientId, options = {}) => {
  const res = await api.get(`/clinical-records/patient/${patientId}`, options);
  return res.data;
};

export const createClinicalRecord = async (data, options = {}) => {
  const res = await api.post('/clinical-records', data, options);
  return res.data;
};

export const updateClinicalRecord = async (id, data, options = {}) => {
  const res = await api.put(`/clinical-records/${id}`, data, options);
  return res.data;
};

export const deleteClinicalRecord = async (id, options = {}) => {
  const res = await api.delete(`/clinical-records/${id}`, options);
  return res.data;
};

export const searchCie10 = async (query, options = {}) => {
  const res = await api.get('/clinical-records/cie10/search', { ...options, params: { q: query } });
  return res.data;
};

export const getCie10Categories = async (options = {}) => {
  const res = await api.get('/clinical-records/cie10/categories', options);
  return res.data;
};

export const createPrescription = async (data, options = {}) => {
  const res = await api.post('/clinical-records/prescriptions', data, options);
  return res.data;
};

export const updatePrescription = async (id, data, options = {}) => {
  const res = await api.put(`/clinical-records/prescriptions/${id}`, data, options);
  return res.data;
};

export const deletePrescription = async (id, options = {}) => {
  const res = await api.delete(`/clinical-records/prescriptions/${id}`, options);
  return res.data;
};

export const getPrescriptionsByRecord = async (recordId, options = {}) => {
  const res = await api.get(`/clinical-records/${recordId}/prescriptions`, options);
  return res.data;
};
