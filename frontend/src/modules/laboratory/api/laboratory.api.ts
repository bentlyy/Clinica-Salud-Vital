import api from '../../../api/axios';
import type {
  LabTest, LabRequest, LabRequestItem, LabSample, LabArea,
  LabDashboardMetrics, LabAreaDashboard, LabAnalyticsData,
  LabQCRecord, LabEquipment, LabReagent, LabNotification, LabResultHistory,
  LabRequestStatus, LabFilterState,
} from '../types';

// === DASHBOARD ===
export async function getDashboardMetrics(areaId?: number): Promise<LabDashboardMetrics> {
  const params = areaId ? { area_id: areaId } : {};
  const res = await api.get('/laboratory/dashboard', { params });
  return res.data;
}

export async function getAreaDashboard(areaId: number): Promise<LabAreaDashboard> {
  const res = await api.get(`/laboratory/dashboard/area/${areaId}`);
  return res.data;
}

export async function getAnalyticsData(filters?: Partial<LabFilterState>): Promise<LabAnalyticsData> {
  const res = await api.get('/laboratory/dashboard/analytics', { params: filters });
  return res.data;
}

// === LAB TESTS (CATALOG) ===
export async function getLabTests(params?: Record<string, unknown>): Promise<LabTest[]> {
  const res = await api.get('/laboratory/tests', { params });
  return res.data;
}

export async function createLabTest(data: Partial<LabTest>): Promise<LabTest> {
  const res = await api.post('/laboratory/tests', data);
  return res.data;
}

export async function updateLabTest(id: number, data: Partial<LabTest>): Promise<LabTest> {
  const res = await api.put(`/laboratory/tests/${id}`, data);
  return res.data;
}

export async function deleteLabTest(id: number): Promise<void> {
  await api.delete(`/laboratory/tests/${id}`);
}

// === LAB REQUESTS ===
export async function getLabRequests(params?: Record<string, unknown>): Promise<LabRequest[]> {
  const res = await api.get('/laboratory', { params });
  return res.data;
}

export async function getLabRequestById(id: number): Promise<LabRequest> {
  const res = await api.get(`/laboratory/${id}`);
  return res.data;
}

export async function createLabRequest(data: {
  patient_id: number;
  doctor_id?: number;
  clinical_record_id?: number;
  priority?: string;
  notes?: string;
  test_ids?: number[];
  items?: { lab_test_id: number; notes?: string }[];
}): Promise<LabRequest> {
  const res = await api.post('/laboratory', data);
  return res.data;
}

export async function updateLabRequestStatus(id: number, status: LabRequestStatus): Promise<LabRequest> {
  const res = await api.patch(`/laboratory/${id}/status`, { status });
  return res.data;
}

export async function cancelLabRequest(id: number): Promise<LabRequest> {
  const res = await api.delete(`/laboratory/${id}`);
  return res.data;
}

export async function downloadLabOrderPdf(id: number): Promise<Blob> {
  const res = await api.get(`/laboratory/${id}/pdf`, { responseType: 'blob' });
  return res.data;
}

// === LAB REQUEST ITEMS ===
export async function updateLabRequestItemResult(
  itemId: number,
  data: { result_value: string; result_notes?: string }
): Promise<LabRequestItem> {
  const res = await api.patch(`/laboratory/items/${itemId}/result`, data);
  return res.data;
}

export async function updateLabRequestItemStatus(
  itemId: number,
  status: LabRequestStatus
): Promise<LabRequestItem> {
  const res = await api.patch(`/laboratory/lab/items/${itemId}/status`, { status });
  return res.data;
}

export async function validateItemByTech(itemId: number): Promise<LabRequestItem> {
  const res = await api.patch(`/laboratory/items/${itemId}/validate-tech`);
  return res.data;
}

export async function validateItemByDoctor(itemId: number): Promise<LabRequestItem> {
  const res = await api.patch(`/laboratory/items/${itemId}/validate-doctor`);
  return res.data;
}

export async function signItem(itemId: number): Promise<LabRequestItem> {
  const res = await api.patch(`/laboratory/items/${itemId}/sign`);
  return res.data;
}

export async function deliverItem(itemId: number, method?: string): Promise<LabRequestItem> {
  const res = await api.patch(`/laboratory/items/${itemId}/deliver`, { method });
  return res.data;
}

export async function getItemHistory(itemId: number): Promise<LabResultHistory[]> {
  const res = await api.get(`/laboratory/items/${itemId}/history`);
  return res.data;
}

// === SAMPLES ===
export async function getSamples(params?: Record<string, unknown>): Promise<LabSample[]> {
  const res = await api.get('/laboratory/samples', { params });
  return res.data;
}

export async function getSampleById(id: number): Promise<LabSample> {
  const res = await api.get(`/laboratory/samples/${id}`);
  return res.data;
}

export async function createSample(data: Partial<LabSample>): Promise<LabSample> {
  const res = await api.post('/laboratory/samples', data);
  return res.data;
}

export async function receiveSample(id: number, data?: { reception_time?: string }): Promise<LabSample> {
  const res = await api.patch(`/laboratory/samples/${id}/receive`, data || {});
  return res.data;
}

export async function verifySample(id: number): Promise<LabSample> {
  const res = await api.patch(`/laboratory/samples/${id}/verify`);
  return res.data;
}

export async function assignSample(id: number, data: { assigned_tech_id: number; assigned_equipment_id?: number }): Promise<LabSample> {
  const res = await api.patch(`/laboratory/samples/${id}/assign`, data);
  return res.data;
}

export async function recordSampleQC(id: number, data: { qc_status: string; qc_notes?: string }): Promise<LabSample> {
  const res = await api.patch(`/laboratory/samples/${id}/qc`, data);
  return res.data;
}

export async function rejectSample(id: number, reason: string): Promise<LabSample> {
  const res = await api.patch(`/laboratory/samples/${id}/reject`, { rejection_reason: reason });
  return res.data;
}

// === AREAS ===
export async function getLabAreas(): Promise<LabArea[]> {
  const res = await api.get('/laboratory/areas');
  return res.data;
}

export async function createLabArea(data: Partial<LabArea>): Promise<LabArea> {
  const res = await api.post('/laboratory/areas', data);
  return res.data;
}

// === QC ===
export async function getQCRecords(params?: Record<string, unknown>): Promise<LabQCRecord[]> {
  const res = await api.get('/laboratory/qc', { params });
  return res.data;
}

export async function createQCRecord(data: Partial<LabQCRecord>): Promise<LabQCRecord> {
  const res = await api.post('/laboratory/qc', data);
  return res.data;
}

export async function getQCStatistics(areaId?: number): Promise<{ total: number; passed: number; failed: number; warning: number }> {
  const params = areaId ? { area_id: areaId } : {};
  const res = await api.get('/laboratory/qc/statistics', { params });
  return res.data;
}

// === EQUIPMENT ===
export async function getEquipment(params?: Record<string, unknown>): Promise<LabEquipment[]> {
  const res = await api.get('/laboratory/equipment', { params });
  return res.data;
}

export async function createEquipment(data: Partial<LabEquipment>): Promise<LabEquipment> {
  const res = await api.post('/laboratory/equipment', data);
  return res.data;
}

export async function updateEquipment(id: number, data: Partial<LabEquipment>): Promise<LabEquipment> {
  const res = await api.put(`/laboratory/equipment/${id}`, data);
  return res.data;
}

// === REAGENTS ===
export async function getReagents(params?: Record<string, unknown>): Promise<LabReagent[]> {
  const res = await api.get('/laboratory/reagents', { params });
  return res.data;
}

export async function createReagent(data: Partial<LabReagent>): Promise<LabReagent> {
  const res = await api.post('/laboratory/reagents', data);
  return res.data;
}

export async function updateReagentStock(id: number, quantity: number): Promise<LabReagent> {
  const res = await api.patch(`/laboratory/reagents/${id}/stock`, { quantity });
  return res.data;
}

// === NOTIFICATIONS ===
export async function getNotifications(params?: Record<string, unknown>): Promise<LabNotification[]> {
  const res = await api.get('/laboratory/notifications', { params });
  return res.data;
}

export async function acknowledgeNotification(id: number): Promise<LabNotification> {
  const res = await api.patch(`/laboratory/notifications/${id}/ack`);
  return res.data;
}

// === LAB TECHNICIAN ENDPOINTS ===
export async function getAllRequestsForLab(status?: string): Promise<LabRequest[]> {
  const params = status ? { status } : {};
  const res = await api.get('/laboratory/lab/all', { params });
  return res.data;
}
