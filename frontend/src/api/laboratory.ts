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
  lab_test_id: string;
  test_name?: string;
  result_value?: string;
  result_notes?: string;
  reference_range?: string;
  unit?: string;
  [key: string]: unknown;
}

export interface DashboardMetrics {
  pending: number;
  received: number;
  in_progress: number;
  pending_validation: number;
  validated: number;
  delivered: number;
  rejected: number;
  repeated: number;
  urgent: number;
  critical_unvalidated: number;
  average_processing_time_min: number;
  samples_processed_today: number;
  productivity_per_hour: number;
  sla_breached: number;
  sla_at_risk: number;
  [key: string]: unknown;
}

// === Test Catalog ===
export const getLabTests = async (params: Record<string, unknown> = {}, options: Record<string, unknown> = {}): Promise<LabTest[]> => {
  const res = await api.get('/laboratory/tests', { params, signal: options.signal as AbortSignal });
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
  await api.delete(`/laboratory/tests/${id}`, { signal: options.signal as AbortSignal });
};

// === Lab Requests ===
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

export const updateLabRequestStatus = async (id: string, status: string, options: Record<string, unknown> = {}): Promise<LabRequest> => {
  const res = await api.patch(`/laboratory/${id}/status`, { status }, { signal: options.signal as AbortSignal });
  return res.data;
};

export const cancelLabRequest = async (id: string, options: Record<string, unknown> = {}): Promise<void> => {
  await api.delete(`/laboratory/${id}`, { signal: options.signal as AbortSignal });
};

export const downloadLabOrderPdf = async (id: string, options: Record<string, unknown> = {}): Promise<Blob> => {
  const res = await api.get(`/laboratory/${id}/pdf`, { responseType: 'blob', signal: options.signal as AbortSignal });
  return res.data;
};

// === Results ===
export const updateLabResultItem = async (id: string, itemId: string, data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<LabRequest> => {
  const res = await api.patch(`/laboratory/items/${itemId}/result`, data, { signal: options.signal as AbortSignal });
  return res.data;
};

// === Lab Technician ===
export const getAllLabRequestsForLab = async (status?: string, options: Record<string, unknown> = {}): Promise<LabRequest[]> => {
  const res = await api.get('/laboratory/lab/all', { params: status ? { status } : {}, signal: options.signal as AbortSignal });
  return res.data;
};

// === Dashboard ===
export const getLabDashboardMetrics = async (options: Record<string, unknown> = {}): Promise<DashboardMetrics> => {
  const res = await api.get('/laboratory/dashboard', { signal: options.signal as AbortSignal });
  return res.data;
};

export const getLabAreaDashboard = async (areaId: number, options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.get(`/laboratory/dashboard/area/${areaId}`, { signal: options.signal as AbortSignal });
  return res.data;
};

export const getLabAnalytics = async (options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.get('/laboratory/dashboard/analytics', { signal: options.signal as AbortSignal });
  return res.data;
};

// === Samples ===
export const getLabSamples = async (params: Record<string, unknown> = {}, options: Record<string, unknown> = {}): Promise<any[]> => {
  const res = await api.get('/laboratory/samples', { params, signal: options.signal as AbortSignal });
  return res.data;
};

export const getLabSampleById = async (id: string, options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.get(`/laboratory/samples/${id}`, { signal: options.signal as AbortSignal });
  return res.data;
};

export const createLabSample = async (data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.post('/laboratory/samples', data, { signal: options.signal as AbortSignal });
  return res.data;
};

export const receiveLabSample = async (id: string, data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.patch(`/laboratory/samples/${id}/receive`, data, { signal: options.signal as AbortSignal });
  return res.data;
};

export const verifyLabSample = async (id: string, options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.patch(`/laboratory/samples/${id}/verify`, {}, { signal: options.signal as AbortSignal });
  return res.data;
};

export const assignLabSample = async (id: string, data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.patch(`/laboratory/samples/${id}/assign`, data, { signal: options.signal as AbortSignal });
  return res.data;
};

export const recordSampleQC = async (id: string, data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.patch(`/laboratory/samples/${id}/qc`, data, { signal: options.signal as AbortSignal });
  return res.data;
};

export const rejectLabSample = async (id: string, data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.patch(`/laboratory/samples/${id}/reject`, data, { signal: options.signal as AbortSignal });
  return res.data;
};

// === Areas ===
export const getLabAreas = async (options: Record<string, unknown> = {}): Promise<any[]> => {
  const res = await api.get('/laboratory/areas', { signal: options.signal as AbortSignal });
  return res.data;
};

export const createLabArea = async (data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.post('/laboratory/areas', data, { signal: options.signal as AbortSignal });
  return res.data;
};

// === QC Records ===
export const getLabQCRecords = async (options: Record<string, unknown> = {}): Promise<any[]> => {
  const res = await api.get('/laboratory/qc', { signal: options.signal as AbortSignal });
  return res.data;
};

export const createLabQCRecord = async (data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.post('/laboratory/qc', data, { signal: options.signal as AbortSignal });
  return res.data;
};

export const getLabQCStatistics = async (options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.get('/laboratory/qc/statistics', { signal: options.signal as AbortSignal });
  return res.data;
};

// === Equipment ===
export const getLabEquipment = async (options: Record<string, unknown> = {}): Promise<any[]> => {
  const res = await api.get('/laboratory/equipment', { signal: options.signal as AbortSignal });
  return res.data;
};

export const createLabEquipment = async (data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.post('/laboratory/equipment', data, { signal: options.signal as AbortSignal });
  return res.data;
};

export const updateLabEquipment = async (id: string, data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.put(`/laboratory/equipment/${id}`, data, { signal: options.signal as AbortSignal });
  return res.data;
};

// === Reagents ===
export const getLabReagents = async (options: Record<string, unknown> = {}): Promise<any[]> => {
  const res = await api.get('/laboratory/reagents', { signal: options.signal as AbortSignal });
  return res.data;
};

export const createLabReagent = async (data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.post('/laboratory/reagents', data, { signal: options.signal as AbortSignal });
  return res.data;
};

export const updateLabReagentStock = async (id: string, data: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.patch(`/laboratory/reagents/${id}/stock`, data, { signal: options.signal as AbortSignal });
  return res.data;
};

// === Notifications ===
export const getLabNotifications = async (options: Record<string, unknown> = {}): Promise<any[]> => {
  const res = await api.get('/laboratory/notifications', { signal: options.signal as AbortSignal });
  return res.data;
};

export const acknowledgeLabNotification = async (id: string, options: Record<string, unknown> = {}): Promise<any> => {
  const res = await api.patch(`/laboratory/notifications/${id}/ack`, {}, { signal: options.signal as AbortSignal });
  return res.data;
};

// === Clinical Records ===
export const getLabResultsByClinicalRecord = async (clinicalRecordId: string, options: Record<string, unknown> = {}): Promise<LabRequest[]> => {
  const res = await api.get(`/clinical-records/${clinicalRecordId}/lab-results`, { signal: options.signal as AbortSignal });
  return res.data;
};
