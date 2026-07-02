import api from './axios';

export const getLabTests = async (params = {}, options = {}) => {
  const res = await api.get('/laboratory/tests', { params, signal: options.signal });
  return res.data;
};

export const getLabRequests = async (params = {}, options = {}) => {
  const res = await api.get('/laboratory', { params, signal: options.signal });
  return res.data;
};

export const getLabRequestById = async (id, options = {}) => {
  const res = await api.get(`/laboratory/${id}`, { signal: options.signal });
  return res.data;
};

export const createLabRequest = async (data, options = {}) => {
  const res = await api.post('/laboratory', data, { signal: options.signal });
  return res.data;
};

export const updateLabRequest = async (id, data, options = {}) => {
  const res = await api.put(`/laboratory/${id}`, data, { signal: options.signal });
  return res.data;
};

export const deleteLabRequest = async (id, options = {}) => {
  const res = await api.delete(`/laboratory/${id}`, { signal: options.signal });
  return res.data;
};

export const addLabResult = async (id, data, options = {}) => {
  const res = await api.post(`/laboratory/${id}/results`, data, { signal: options.signal });
  return res.data;
};

export const updateLabResultItem = async (id, itemId, data, options = {}) => {
  const res = await api.put(`/laboratory/${id}/results/${itemId}`, data, { signal: options.signal });
  return res.data;
};

export const downloadLabOrderPdf = async (id, options = {}) => {
  const res = await api.get(`/laboratory/${id}/pdf`, { responseType: 'blob', signal: options.signal });
  return res.data;
};

export const getLabResultsByClinicalRecord = async (clinicalRecordId, options = {}) => {
  const res = await api.get(`/clinical-records/${clinicalRecordId}/lab-results`, { signal: options.signal });
  return res.data;
};

export const createLabTest = async (data, options = {}) => {
  const res = await api.post('/laboratory/tests', data, { signal: options.signal });
  return res.data;
};

export const updateLabTest = async (id, data, options = {}) => {
  const res = await api.put(`/laboratory/tests/${id}`, data, { signal: options.signal });
  return res.data;
};

export const deleteLabTest = async (id, options = {}) => {
  const res = await api.delete(`/laboratory/tests/${id}`, { signal: options.signal });
  return res.data;
};
