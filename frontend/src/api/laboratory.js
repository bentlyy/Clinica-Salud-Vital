import api from './axios';

export const getLabTests = async (params = {}) => {
  const res = await api.get('/laboratory/tests', { params });
  return res.data;
};

export const getLabRequests = async (params = {}) => {
  const res = await api.get('/laboratory', { params });
  return res.data;
};

export const getLabRequestById = async (id) => {
  const res = await api.get(`/laboratory/${id}`);
  return res.data;
};

export const createLabRequest = async (data) => {
  const res = await api.post('/laboratory', data);
  return res.data;
};

export const updateLabRequest = async (id, data) => {
  const res = await api.put(`/laboratory/${id}`, data);
  return res.data;
};

export const deleteLabRequest = async (id) => {
  const res = await api.delete(`/laboratory/${id}`);
  return res.data;
};

export const addLabResult = async (id, data) => {
  const res = await api.post(`/laboratory/${id}/results`, data);
  return res.data;
};

export const updateLabResultItem = async (id, itemId, data) => {
  const res = await api.put(`/laboratory/${id}/results/${itemId}`, data);
  return res.data;
};

export const getLabResultsByClinicalRecord = async (clinicalRecordId) => {
  const res = await api.get(`/clinical-records/${clinicalRecordId}/lab-results`);
  return res.data;
};
