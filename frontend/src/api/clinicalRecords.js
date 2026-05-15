import api from './axios';

export const getClinicalRecords = async (params = {}) => {
  const res = await api.get('/clinical-records', { params });
  return res.data;
};

export const getClinicalRecordById = async (id) => {
  const res = await api.get(`/clinical-records/${id}`);
  return res.data;
};

export const getClinicalRecordsByPatient = async (patientId) => {
  const res = await api.get(`/clinical-records/patient/${patientId}`);
  return res.data;
};

export const createClinicalRecord = async (data) => {
  const res = await api.post('/clinical-records', data);
  return res.data;
};

export const updateClinicalRecord = async (id, data) => {
  const res = await api.put(`/clinical-records/${id}`, data);
  return res.data;
};

export const deleteClinicalRecord = async (id) => {
  const res = await api.delete(`/clinical-records/${id}`);
  return res.data;
};

export const searchCie10 = async (query) => {
  const res = await api.get('/clinical-records/cie10/search', { params: { q: query } });
  return res.data;
};

export const getCie10Categories = async () => {
  const res = await api.get('/clinical-records/cie10/categories');
  return res.data;
};

export const getDoctorBookings = async () => {
  const res = await api.get('/bookings/doctor');
  return res.data;
};

export const createPrescription = async (data) => {
  const res = await api.post('/clinical-records/prescriptions', data);
  return res.data;
};

export const updatePrescription = async (id, data) => {
  const res = await api.put(`/clinical-records/prescriptions/${id}`, data);
  return res.data;
};

export const deletePrescription = async (id) => {
  const res = await api.delete(`/clinical-records/prescriptions/${id}`);
  return res.data;
};

export const getPrescriptionsByRecord = async (recordId) => {
  const res = await api.get(`/clinical-records/${recordId}/prescriptions`);
  return res.data;
};
