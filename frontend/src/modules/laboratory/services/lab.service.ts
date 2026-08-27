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

const BASE = '/laboratory';

// ── Dashboard ────────────────────────────────────────────────────────────────

export async function getLabDashboard(opts?: { signal?: AbortSignal }): Promise<LabDashboardMetrics> {
  const { data } = await apiClient.get<LabDashboardMetrics>(`${BASE}/dashboard`, { signal: opts?.signal });
  return data;
}

export async function getAreaDashboard(areaId: number, opts?: { signal?: AbortSignal }): Promise<LabAreaDashboard> {
  const { data } = await apiClient.get<LabAreaDashboard>(`${BASE}/dashboard/area/${areaId}`, { signal: opts?.signal });
  return data;
}

export async function getMyAreaDashboard(opts?: { signal?: AbortSignal }): Promise<LabAreaDashboard> {
  const { data } = await apiClient.get<LabAreaDashboard>(`${BASE}/dashboard`, { signal: opts?.signal });
  return data;
}

export async function getAreaMetrics(areaId: number, opts?: { signal?: AbortSignal }): Promise<LabDashboardMetrics> {
  const { data } = await apiClient.get<LabDashboardMetrics>(`${BASE}/dashboard`, {
    params: { area_id: areaId },
    signal: opts?.signal,
  });
  return data;
}

export async function getMyPending(opts?: { signal?: AbortSignal }): Promise<LabRequest[]> {
  const { data } = await apiClient.get<LabRequest[]>(BASE, { params: { status: 'pending' }, signal: opts?.signal });
  return Array.isArray(data) ? data : (data as any).data ?? [];
}

export async function getUrgentRequests(opts?: { signal?: AbortSignal }): Promise<LabRequest[]> {
  const { data } = await apiClient.get<LabRequest[]>(BASE, { params: { priority: 'urgent' }, signal: opts?.signal });
  return Array.isArray(data) ? data : (data as any).data ?? [];
}

// ── Requests CRUD ────────────────────────────────────────────────────────────

export async function getLabRequests(
  params?: LabRequestListParams,
  opts?: { signal?: AbortSignal },
): Promise<PaginatedResponse<LabRequest>> {
  const { data } = await apiClient.get<LabRequest[] | PaginatedResponse<LabRequest>>(BASE, { params, signal: opts?.signal });
  if (Array.isArray(data)) {
    return { data, total: data.length, page: params?.page ?? 1, limit: params?.limit ?? 20, totalPages: 1 };
  }
  return data;
}

export async function getLabRequestById(id: number, opts?: { signal?: AbortSignal }): Promise<LabRequest> {
  const { data } = await apiClient.get<LabRequest>(`${BASE}/${id}`, { signal: opts?.signal });
  return data;
}

export async function createLabRequest(input: CreateLabRequestInput, opts?: { signal?: AbortSignal }): Promise<LabRequest> {
  const { data } = await apiClient.post<LabRequest>(BASE, input, { signal: opts?.signal });
  return data;
}

export async function updateLabRequest(
  id: number,
  input: Partial<CreateLabRequestInput>,
  opts?: { signal?: AbortSignal },
): Promise<LabRequest> {
  const { data } = await apiClient.patch<LabRequest>(`${BASE}/${id}`, input, { signal: opts?.signal });
  return data;
}

export async function deleteLabRequest(id: number, opts?: { signal?: AbortSignal }): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`, { signal: opts?.signal });
}

export async function cancelLabRequest(id: number, _reason?: string, opts?: { signal?: AbortSignal }): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`, { signal: opts?.signal });
}

export async function updateLabRequestStatus(
  id: number,
  status: string,
  opts?: { signal?: AbortSignal },
): Promise<LabRequest> {
  const { data } = await apiClient.patch<LabRequest>(`${BASE}/${id}/status`, { status }, { signal: opts?.signal });
  return data;
}

// ── Request Items ────────────────────────────────────────────────────────────

export async function getLabRequestItems(requestId: number, opts?: { signal?: AbortSignal }): Promise<LabRequestItem[]> {
  const { data } = await apiClient.get<LabRequest>(`${BASE}/${requestId}`, { signal: opts?.signal });
  return (data as any).items ?? [];
}

export async function addLabRequestItem(
  requestId: number,
  input: { lab_test_id: number; notes?: string },
  opts?: { signal?: AbortSignal },
): Promise<LabRequestItem> {
  const { data } = await apiClient.post<LabRequestItem>(BASE, { ...input, lab_request_id: requestId }, { signal: opts?.signal });
  return data;
}

export async function updateLabRequestItem(
  _requestId: number,
  itemId: number,
  input: Partial<LabRequestItem>,
  opts?: { signal?: AbortSignal },
): Promise<LabRequestItem> {
  const { data } = await apiClient.patch<LabRequestItem>(`${BASE}/items/${itemId}/result`, input, { signal: opts?.signal });
  return data;
}

export async function removeLabRequestItem(_requestId: number, itemId: number, opts?: { signal?: AbortSignal }): Promise<void> {
  await apiClient.delete(`${BASE}/items/${itemId}`, { signal: opts?.signal });
}

// ── Result Entry ─────────────────────────────────────────────────────────────

export async function enterResult(
  _requestId: number,
  itemId: number,
  input: { result_value: string; unit?: string; notes?: string; results?: Record<string, unknown> },
  opts?: { signal?: AbortSignal },
): Promise<LabRequestItem> {
  const { data } = await apiClient.patch<LabRequestItem>(`${BASE}/items/${itemId}/result`, input, { signal: opts?.signal });
  return data;
}

export async function updateResult(
  _requestId: number,
  itemId: number,
  input: { result_value: string; unit?: string; notes?: string; results?: Record<string, unknown> },
  opts?: { signal?: AbortSignal },
): Promise<LabRequestItem> {
  const { data } = await apiClient.patch<LabRequestItem>(`${BASE}/items/${itemId}/result`, input, { signal: opts?.signal });
  return data;
}

// ── Validation ───────────────────────────────────────────────────────────────

export async function validateTech(
  _requestId: number,
  itemId: number,
  input?: { notes?: string },
  opts?: { signal?: AbortSignal },
): Promise<LabRequestItem> {
  const { data } = await apiClient.patch<LabRequestItem>(`${BASE}/items/${itemId}/validate-tech`, input, { signal: opts?.signal });
  return data;
}

export async function validateDoctor(
  _requestId: number,
  itemId: number,
  input?: { notes?: string },
  opts?: { signal?: AbortSignal },
): Promise<LabRequestItem> {
  const { data } = await apiClient.patch<LabRequestItem>(`${BASE}/items/${itemId}/validate-doctor`, input, { signal: opts?.signal });
  return data;
}

export async function signResult(
  _requestId: number,
  itemId: number,
  opts?: { signal?: AbortSignal },
): Promise<LabRequestItem> {
  const { data } = await apiClient.patch<LabRequestItem>(`${BASE}/items/${itemId}/sign`, undefined, { signal: opts?.signal });
  return data;
}

export async function deliverResult(
  _requestId: number,
  itemId: number,
  input?: { method?: string },
  opts?: { signal?: AbortSignal },
): Promise<LabRequestItem> {
  const { data } = await apiClient.patch<LabRequestItem>(`${BASE}/items/${itemId}/deliver`, input, { signal: opts?.signal });
  return data;
}

// ── Samples ──────────────────────────────────────────────────────────────────

export async function getSamples(params?: {
  requestId?: number;
  status?: string;
  areaId?: number;
}, opts?: { signal?: AbortSignal }): Promise<LabSample[]> {
  const { data } = await apiClient.get<LabSample[]>(`${BASE}/samples`, { params, signal: opts?.signal });
  return data;
}

export async function getSampleById(id: number, opts?: { signal?: AbortSignal }): Promise<LabSample> {
  const { data } = await apiClient.get<LabSample>(`${BASE}/samples/${id}`, { signal: opts?.signal });
  return data;
}

export async function createSample(
  input: Partial<LabSample> & { lab_request_item_id: number; sample_type: string; container_type: string },
  opts?: { signal?: AbortSignal },
): Promise<LabSample> {
  const { data } = await apiClient.post<LabSample>(`${BASE}/samples`, input, { signal: opts?.signal });
  return data;
}

export async function updateSample(id: number, input: Partial<LabSample>, opts?: { signal?: AbortSignal }): Promise<LabSample> {
  const { data } = await apiClient.patch<LabSample>(`${BASE}/samples/${id}`, input, { signal: opts?.signal });
  return data;
}

export async function receiveSample(id: number, opts?: { signal?: AbortSignal }): Promise<LabSample> {
  const { data } = await apiClient.patch<LabSample>(`${BASE}/samples/${id}/receive`, undefined, { signal: opts?.signal });
  return data;
}

export async function verifySample(id: number, opts?: { signal?: AbortSignal }): Promise<LabSample> {
  const { data } = await apiClient.patch<LabSample>(`${BASE}/samples/${id}/verify`, undefined, { signal: opts?.signal });
  return data;
}

export async function rejectSample(id: number, reason: string, opts?: { signal?: AbortSignal }): Promise<LabSample> {
  const { data } = await apiClient.patch<LabSample>(`${BASE}/samples/${id}/reject`, { reason }, { signal: opts?.signal });
  return data;
}

// ── Result History ───────────────────────────────────────────────────────────

export async function getResultHistory(
  _patientId: number,
  itemId: number,
  opts?: { signal?: AbortSignal },
): Promise<LabResultHistory[]> {
  const { data } = await apiClient.get<LabResultHistory[]>(`${BASE}/items/${itemId}/history`, { signal: opts?.signal });
  return data;
}

// ── QC Records ───────────────────────────────────────────────────────────────

export async function getQCRecords(params?: {
  areaId?: number;
  testId?: number;
  type?: string;
}, opts?: { signal?: AbortSignal }): Promise<LabQCRecord[]> {
  const { data } = await apiClient.get<LabQCRecord[]>(`${BASE}/qc`, { params, signal: opts?.signal });
  return data;
}

export async function createQCRecord(input: Partial<LabQCRecord>, opts?: { signal?: AbortSignal }): Promise<LabQCRecord> {
  const { data } = await apiClient.post<LabQCRecord>(`${BASE}/qc`, input, { signal: opts?.signal });
  return data;
}

export async function updateQCRecord(id: number, input: Partial<LabQCRecord>, opts?: { signal?: AbortSignal }): Promise<LabQCRecord> {
  const { data } = await apiClient.put<LabQCRecord>(`${BASE}/qc/${id}`, input, { signal: opts?.signal });
  return data;
}

export async function approveQCRecord(id: number, opts?: { signal?: AbortSignal }): Promise<LabQCRecord> {
  const { data } = await apiClient.post<LabQCRecord>(`${BASE}/qc/${id}/approve`, undefined, { signal: opts?.signal });
  return data;
}

// ── Equipment ────────────────────────────────────────────────────────────────

export async function getEquipment(params?: { areaId?: number }, opts?: { signal?: AbortSignal }): Promise<LabEquipment[]> {
  const { data } = await apiClient.get<LabEquipment[]>(`${BASE}/equipment`, { params, signal: opts?.signal });
  return data;
}

export async function createEquipment(input: Partial<LabEquipment>, opts?: { signal?: AbortSignal }): Promise<LabEquipment> {
  const { data } = await apiClient.post<LabEquipment>(`${BASE}/equipment`, input, { signal: opts?.signal });
  return data;
}

export async function updateEquipment(id: number, input: Partial<LabEquipment>, opts?: { signal?: AbortSignal }): Promise<LabEquipment> {
  const { data } = await apiClient.put<LabEquipment>(`${BASE}/equipment/${id}`, input, { signal: opts?.signal });
  return data;
}

// ── Reagents ─────────────────────────────────────────────────────────────────

export async function getReagents(params?: { areaId?: number }, opts?: { signal?: AbortSignal }): Promise<LabReagent[]> {
  const { data } = await apiClient.get<LabReagent[]>(`${BASE}/reagents`, { params, signal: opts?.signal });
  return data;
}

export async function createReagent(input: Partial<LabReagent>, opts?: { signal?: AbortSignal }): Promise<LabReagent> {
  const { data } = await apiClient.post<LabReagent>(`${BASE}/reagents`, input, { signal: opts?.signal });
  return data;
}

export async function updateReagent(id: number, input: Partial<LabReagent>, opts?: { signal?: AbortSignal }): Promise<LabReagent> {
  const { data } = await apiClient.patch<LabReagent>(`${BASE}/reagents/${id}/stock`, input, { signal: opts?.signal });
  return data;
}

// ── Lab Areas & Tests ────────────────────────────────────────────────────────

export async function getLabAreas(opts?: { signal?: AbortSignal }): Promise<LabArea[]> {
  const { data } = await apiClient.get<LabArea[]>(`${BASE}/areas`, { signal: opts?.signal });
  return data;
}

export async function getLabTests(params?: { areaId?: number }, opts?: { signal?: AbortSignal }): Promise<LabTest[]> {
  const { data } = await apiClient.get<LabTest[]>(`${BASE}/tests`, { params, signal: opts?.signal });
  return data;
}

// ── Analytics ────────────────────────────────────────────────────────────────

export async function getLabAnalytics(params?: {
  dateFrom?: string;
  dateTo?: string;
  areaId?: number;
}, opts?: { signal?: AbortSignal }): Promise<LabAnalyticsData> {
  const { data } = await apiClient.get<LabAnalyticsData>(`${BASE}/dashboard/analytics`, { params, signal: opts?.signal });
  return data;
}

export async function getLabAnalyticsByDoctor(
  doctorId: number,
  opts?: { signal?: AbortSignal },
): Promise<{ doctor_name: string; count: number; avg_time_min: number }> {
  const { data } = await apiClient.get(`${BASE}/dashboard/analytics`, { params: { doctor_id: doctorId }, signal: opts?.signal });
  return data;
}

// ── Notifications ────────────────────────────────────────────────────────────

export async function getLabNotifications(opts?: { signal?: AbortSignal }): Promise<LabNotification[]> {
  const { data } = await apiClient.get<LabNotification[]>(`${BASE}/notifications`, { signal: opts?.signal });
  return data;
}

export async function acknowledgeNotification(id: number, opts?: { signal?: AbortSignal }): Promise<LabNotification> {
  const { data } = await apiClient.patch<LabNotification>(`${BASE}/notifications/${id}/ack`, undefined, { signal: opts?.signal });
  return data;
}

export async function acknowledgeAllNotifications(opts?: { signal?: AbortSignal }): Promise<void> {
  await apiClient.post(`${BASE}/notifications/acknowledge-all`, undefined, { signal: opts?.signal });
}

// ── SSE ──────────────────────────────────────────────────────────────────────

export function subscribeToLabSSE(onMessage: (event: MessageEvent) => void): EventSource {
  const token = localStorage.getItem('access_token');
  const url = `${import.meta.env.VITE_API_URL || '/api'}${BASE}/events${token ? `?token=${token}` : ''}`;
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
