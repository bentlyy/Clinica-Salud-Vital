import api from './axios';

export const getLabTests = async (params = {}) => {
  const res = await api.get('/lab-requests/tests', { params });
  return res.data;
};

export const getLabRequests = async (params = {}) => {
  const res = await api.get('/lab-requests', { params });
  return res.data;
};

export const getLabRequestById = async (id) => {
  const res = await api.get(`/lab-requests/${id}`);
  return res.data;
};

export const createLabRequest = async (data) => {
  const res = await api.post('/lab-requests', data);
  return res.data;
};

export const updateLabRequest = async (id, data) => {
  const res = await api.put(`/lab-requests/${id}`, data);
  return res.data;
};

export const deleteLabRequest = async (id) => {
  const res = await api.delete(`/lab-requests/${id}`);
  return res.data;
};

export const addLabResult = async (id, data) => {
  const res = await api.post(`/lab-requests/${id}/results`, data);
  return res.data;
};

export const updateLabResultItem = async (id, itemId, data) => {
  const res = await api.put(`/lab-requests/${id}/results/${itemId}`, data);
  return res.data;
};

export const getLabResultsByClinicalRecord = async (clinicalRecordId) => {
  const res = await api.get(`/clinical-records/${clinicalRecordId}/lab-results`);
  return res.data;
};
