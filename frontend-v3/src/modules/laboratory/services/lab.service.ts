import { apiClient } from '@/shared/services/api-client';
import type {
  LabRequest,
  LabRequestListParams,
  LabRequestItem,
  LabArea,
  LabTest,
  LabDashboardMetrics,
  LabAreaDashboard,
  LabSample,
  LabResultHistory,
  LabQCRecord,
  LabEquipment,
  LabReagent,
  LabAnalyticsData,
  LabNotification,
  CreateLabRequestInput,
  PaginatedResponse,
} from '../types/lab.types';

const BASE = '/api/laboratory';

// ── Dashboard ────────────────────────────────────────────────────────────────

export async function getLabDashboard(): Promise<LabDashboardMetrics> {
  const { data } = await apiClient.get<LabDashboardMetrics>(`${BASE}/dashboard`);
  return data;
}

export async function getAreaDashboard(areaId: number): Promise<LabAreaDashboard> {
  const { data } = await apiClient.get<LabAreaDashboard>(`${BASE}/area-daily`, {
    params: { area_id: areaId },
  });
  return data;
}

export async function getMyAreaDashboard(): Promise<LabAreaDashboard> {
  const { data } = await apiClient.get<LabAreaDashboard>(`${BASE}/my-area`);
  return data;
}

export async function getAreaMetrics(areaId: number): Promise<LabDashboardMetrics> {
  const { data } = await apiClient.get<LabDashboardMetrics>(`${BASE}/area-metrics`, {
    params: { area_id: areaId },
  });
  return data;
}

export async function getMyPending(): Promise<LabRequest[]> {
  const { data } = await apiClient.get<LabRequest[]>(`${BASE}/my-pending`);
  return data;
}

export async function getUrgentRequests(): Promise<LabRequest[]> {
  const { data } = await apiClient.get<LabRequest[]>(`${BASE}/urgent`);
  return data;
}

// ── Requests CRUD ────────────────────────────────────────────────────────────

export async function getLabRequests(
  params?: LabRequestListParams
): Promise<PaginatedResponse<LabRequest>> {
  const { data } = await apiClient.get<PaginatedResponse<LabRequest>>(BASE, { params });
  return data;
}

export async function getLabRequestById(id: number): Promise<LabRequest> {
  const { data } = await apiClient.get<LabRequest>(`${BASE}/${id}`);
  return data;
}

export async function createLabRequest(input: CreateLabRequestInput): Promise<LabRequest> {
  const { data } = await apiClient.post<LabRequest>(BASE, input);
  return data;
}

export async function updateLabRequest(
  id: number,
  input: Partial<CreateLabRequestInput>
): Promise<LabRequest> {
  const { data } = await apiClient.patch<LabRequest>(`${BASE}/${id}`, input);
  return data;
}

export async function deleteLabRequest(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function cancelLabRequest(id: number, reason?: string): Promise<LabRequest> {
  const { data } = await apiClient.post<LabRequest>(`${BASE}/${id}/cancel`, { reason });
  return data;
}

export async function updateLabRequestStatus(
  id: number,
  status: string,
): Promise<LabRequest> {
  const { data } = await apiClient.patch<LabRequest>(`${BASE}/${id}/status`, { status });
  return data;
}

// ── Request Items ────────────────────────────────────────────────────────────

export async function getLabRequestItems(requestId: number): Promise<LabRequestItem[]> {
  const { data } = await apiClient.get<LabRequestItem[]>(`${BASE}/${requestId}/items`);
  return data;
}

export async function addLabRequestItem(
  requestId: number,
  input: { lab_test_id: number; notes?: string }
): Promise<LabRequestItem> {
  const { data } = await apiClient.post<LabRequestItem>(`${BASE}/${requestId}/items`, input);
  return data;
}

export async function updateLabRequestItem(
  requestId: number,
  itemId: number,
  input: Partial<LabRequestItem>
): Promise<LabRequestItem> {
  const { data } = await apiClient.patch<LabRequestItem>(
    `${BASE}/${requestId}/items/${itemId}`,
    input
  );
  return data;
}

export async function removeLabRequestItem(requestId: number, itemId: number): Promise<void> {
  await apiClient.delete(`${BASE}/${requestId}/items/${itemId}`);
}

// ── Result Entry ─────────────────────────────────────────────────────────────

export async function enterResult(
  requestId: number,
  itemId: number,
  input: { result_value: string; unit?: string; notes?: string; results?: Record<string, unknown> }
): Promise<LabRequestItem> {
  const { data } = await apiClient.post<LabRequestItem>(
    `${BASE}/${requestId}/items/${itemId}/result`,
    input
  );
  return data;
}

export async function updateResult(
  requestId: number,
  itemId: number,
  input: { result_value: string; unit?: string; notes?: string; results?: Record<string, unknown> }
): Promise<LabRequestItem> {
  const { data } = await apiClient.patch<LabRequestItem>(
    `${BASE}/${requestId}/items/${itemId}/result`,
    input
  );
  return data;
}

// ── Validation ───────────────────────────────────────────────────────────────

export async function validateTech(
  requestId: number,
  itemId: number,
  input?: { notes?: string }
): Promise<LabRequestItem> {
  const { data } = await apiClient.post<LabRequestItem>(
    `${BASE}/${requestId}/items/${itemId}/validate-tech`,
    input
  );
  return data;
}

export async function validateDoctor(
  requestId: number,
  itemId: number,
  input?: { notes?: string }
): Promise<LabRequestItem> {
  const { data } = await apiClient.post<LabRequestItem>(
    `${BASE}/${requestId}/items/${itemId}/validate-doctor`,
    input
  );
  return data;
}

export async function signResult(
  requestId: number,
  itemId: number
): Promise<LabRequestItem> {
  const { data } = await apiClient.post<LabRequestItem>(
    `${BASE}/${requestId}/items/${itemId}/sign`
  );
  return data;
}

export async function deliverResult(
  requestId: number,
  itemId: number,
  input?: { method?: string }
): Promise<LabRequestItem> {
  const { data } = await apiClient.post<LabRequestItem>(
    `${BASE}/${requestId}/items/${itemId}/deliver`,
    input
  );
  return data;
}

// ── Samples ──────────────────────────────────────────────────────────────────

export async function getSamples(params?: {
  requestId?: number;
  status?: string;
  areaId?: number;
}): Promise<LabSample[]> {
  const { data } = await apiClient.get<LabSample[]>(`${BASE}/samples`, { params });
  return data;
}

export async function getSampleById(id: number): Promise<LabSample> {
  const { data } = await apiClient.get<LabSample>(`${BASE}/samples/${id}`);
  return data;
}

export async function createSample(
  input: Partial<LabSample> & { lab_request_item_id: number; sample_type: string; container_type: string }
): Promise<LabSample> {
  const { data } = await apiClient.post<LabSample>(`${BASE}/samples`, input);
  return data;
}

export async function updateSample(id: number, input: Partial<LabSample>): Promise<LabSample> {
  const { data } = await apiClient.patch<LabSample>(`${BASE}/samples/${id}`, input);
  return data;
}

export async function receiveSample(id: number): Promise<LabSample> {
  const { data } = await apiClient.post<LabSample>(`${BASE}/samples/${id}/receive`);
  return data;
}

export async function verifySample(id: number): Promise<LabSample> {
  const { data } = await apiClient.post<LabSample>(`${BASE}/samples/${id}/verify`);
  return data;
}

export async function rejectSample(id: number, reason: string): Promise<LabSample> {
  const { data } = await apiClient.post<LabSample>(`${BASE}/samples/${id}/reject`, { reason });
  return data;
}

// ── Result History ───────────────────────────────────────────────────────────

export async function getResultHistory(
  patientId: number,
  testId: number
): Promise<LabResultHistory[]> {
  const { data } = await apiClient.get<LabResultHistory[]>(
    `${BASE}/result-history/${patientId}/${testId}`
  );
  return data;
}

// ── QC Records ───────────────────────────────────────────────────────────────

export async function getQCRecords(params?: {
  areaId?: number;
  testId?: number;
  type?: string;
}): Promise<LabQCRecord[]> {
  const { data } = await apiClient.get<LabQCRecord[]>(`${BASE}/lab-qc-records`, { params });
  return data;
}

export async function createQCRecord(input: Partial<LabQCRecord>): Promise<LabQCRecord> {
  const { data } = await apiClient.post<LabQCRecord>(`${BASE}/lab-qc-records`, input);
  return data;
}

export async function updateQCRecord(id: number, input: Partial<LabQCRecord>): Promise<LabQCRecord> {
  const { data } = await apiClient.patch<LabQCRecord>(`${BASE}/lab-qc-records/${id}`, input);
  return data;
}

export async function approveQCRecord(id: number): Promise<LabQCRecord> {
  const { data } = await apiClient.post<LabQCRecord>(`${BASE}/lab-qc-records/${id}/approve`);
  return data;
}

// ── Equipment ────────────────────────────────────────────────────────────────

export async function getEquipment(params?: { areaId?: number }): Promise<LabEquipment[]> {
  const { data } = await apiClient.get<LabEquipment[]>(`${BASE}/lab-equipment`, { params });
  return data;
}

export async function createEquipment(input: Partial<LabEquipment>): Promise<LabEquipment> {
  const { data } = await apiClient.post<LabEquipment>(`${BASE}/lab-equipment`, input);
  return data;
}

export async function updateEquipment(id: number, input: Partial<LabEquipment>): Promise<LabEquipment> {
  const { data } = await apiClient.patch<LabEquipment>(`${BASE}/lab-equipment/${id}`, input);
  return data;
}

// ── Reagents ─────────────────────────────────────────────────────────────────

export async function getReagents(params?: { areaId?: number }): Promise<LabReagent[]> {
  const { data } = await apiClient.get<LabReagent[]>(`${BASE}/lab-reagents`, { params });
  return data;
}

export async function createReagent(input: Partial<LabReagent>): Promise<LabReagent> {
  const { data } = await apiClient.post<LabReagent>(`${BASE}/lab-reagents`, input);
  return data;
}

export async function updateReagent(id: number, input: Partial<LabReagent>): Promise<LabReagent> {
  const { data } = await apiClient.patch<LabReagent>(`${BASE}/lab-reagents/${id}`, input);
  return data;
}

// ── Lab Areas & Tests ────────────────────────────────────────────────────────

export async function getLabAreas(): Promise<LabArea[]> {
  const { data } = await apiClient.get<LabArea[]>(`${BASE}/lab-areas`);
  return data;
}

export async function getLabTests(params?: { areaId?: number }): Promise<LabTest[]> {
  const { data } = await apiClient.get<LabTest[]>(`${BASE}/lab-tests`, { params });
  return data;
}

// ── Analytics ────────────────────────────────────────────────────────────────

export async function getLabAnalytics(params?: {
  dateFrom?: string;
  dateTo?: string;
  areaId?: number;
}): Promise<LabAnalyticsData> {
  const { data } = await apiClient.get<LabAnalyticsData>(`${BASE}/analytics`, { params });
  return data;
}

export async function getLabAnalyticsByDoctor(
  doctorId: number
): Promise<{ doctor_name: string; count: number; avg_time_min: number }> {
  const { data } = await apiClient.get(`${BASE}/analytics/by-doctor/${doctorId}`);
  return data;
}

// ── Notifications ────────────────────────────────────────────────────────────

export async function getLabNotifications(): Promise<LabNotification[]> {
  const { data } = await apiClient.get<LabNotification[]>(`${BASE}/notifications`);
  return data;
}

export async function acknowledgeNotification(id: number): Promise<LabNotification> {
  const { data } = await apiClient.post<LabNotification>(`${BASE}/notifications/${id}/acknowledge`);
  return data;
}

export async function acknowledgeAllNotifications(): Promise<void> {
  await apiClient.post(`${BASE}/notifications/acknowledge-all`);
}

// ── SSE ──────────────────────────────────────────────────────────────────────

export function subscribeToLabSSE(onMessage: (event: MessageEvent) => void): EventSource {
  const token = localStorage.getItem('access_token');
  const url = `${import.meta.env.VITE_API_URL || '/api'}${BASE}/notifications/stream${token ? `?token=${token}` : ''}`;
  const eventSource = new EventSource(url);
  eventSource.onmessage = onMessage;
  return eventSource;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pendiente',
    received: 'Recibido',
    verified: 'Verificado',
    assigned: 'Asignado',
    processing: 'En Proceso',
    qc_review: 'Control Calidad',
    result_entered: 'Resultado Ingresado',
    validated_tech: 'Validado Técnico',
    validated_doctor: 'Validado Médico',
    signed: 'Firmado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    rejected: 'Rechazado',
    repeated: 'Repetido',
  };
  return map[status] || status;
}

export function getPriorityLabel(priority: string): string {
  const map: Record<string, string> = {
    low: 'Baja',
    normal: 'Normal',
    urgent: 'Urgente',
    emergency: 'Emergencia',
  };
  return map[priority] || priority;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'warning',
    received: 'info',
    verified: 'info',
    assigned: 'info',
    processing: 'warning',
    qc_review: 'warning',
    result_entered: 'info',
    validated_tech: 'success',
    validated_doctor: 'success',
    signed: 'success',
    delivered: 'success',
    cancelled: 'default',
    rejected: 'error',
    repeated: 'warning',
  };
  return map[status] || 'default';
}

export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    low: 'default',
    normal: 'info',
    urgent: 'warning',
    emergency: 'error',
  };
  return map[priority] || 'default';
}
