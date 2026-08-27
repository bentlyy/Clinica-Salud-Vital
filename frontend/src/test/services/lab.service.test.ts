import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const apiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import {
  getLabDashboard,
  getAreaDashboard,
  getMyAreaDashboard,
  getAreaMetrics,
  getMyPending,
  getUrgentRequests,
  getLabRequests,
  getLabRequestById,
  createLabRequest,
  updateLabRequest,
  deleteLabRequest,
  cancelLabRequest,
  updateLabRequestStatus,
  getLabRequestItems,
  addLabRequestItem,
  updateLabRequestItem,
  removeLabRequestItem,
  enterResult,
  updateResult,
  validateTech,
  validateDoctor,
  signResult,
  deliverResult,
  getSamples,
  getSampleById,
  createSample,
  updateSample,
  receiveSample,
  verifySample,
  rejectSample,
  getResultHistory,
  getQCRecords,
  createQCRecord,
  updateQCRecord,
  approveQCRecord,
  getEquipment,
  createEquipment,
  updateEquipment,
  getReagents,
  createReagent,
  updateReagent,
  getLabAreas,
  getLabTests,
  getLabAnalytics,
  getLabAnalyticsByDoctor,
  getLabNotifications,
  acknowledgeNotification,
  acknowledgeAllNotifications,
  subscribeToLabSSE,
  getStatusLabel,
  getPriorityLabel,
  getStatusColor,
  getPriorityColor,
} from '@/modules/laboratory/services/lab.service';

const signal = new AbortController().signal;

describe('lab.service dashboard endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getLabDashboard calls GET /laboratory/dashboard', async () => {
    const payload = { pending: 3, urgent: 1 };
    apiClient.get.mockResolvedValue({ data: payload });
    const result = await getLabDashboard({ signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/dashboard', { signal });
    expect(result).toEqual(payload);
  });

  it('getAreaDashboard calls GET /laboratory/dashboard/area/:areaId', async () => {
    const payload = { area: { id: 2 } };
    apiClient.get.mockResolvedValue({ data: payload });
    await getAreaDashboard(2, { signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/dashboard/area/2', { signal });
  });

  it('getMyAreaDashboard calls GET /laboratory/dashboard', async () => {
    apiClient.get.mockResolvedValue({ data: { area: {} } });
    await getMyAreaDashboard({ signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/dashboard', { signal });
  });

  it('getAreaMetrics calls GET /laboratory/dashboard with area_id param', async () => {
    apiClient.get.mockResolvedValue({ data: {} });
    await getAreaMetrics(5, { signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/dashboard', {
      params: { area_id: 5 },
      signal,
    });
  });

  it('getMyPending calls GET /laboratory with status=pending', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await getMyPending({ signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory', {
      params: { status: 'pending' },
      signal,
    });
  });

  it('getUrgentRequests calls GET /laboratory with priority=urgent', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await getUrgentRequests({ signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory', {
      params: { priority: 'urgent' },
      signal,
    });
  });
});

describe('lab.service request CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getLabRequests passes pagination/filter params', async () => {
    apiClient.get.mockResolvedValue({ data: { data: [], total: 0 } });
    const params = { page: 2, limit: 25, status: 'pending', area_id: 3 };
    const result = await getLabRequests(params, { signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory', { params, signal });
    expect(result).toEqual({ data: [], total: 0 });
  });

  it('getLabRequestById calls GET /laboratory/:id', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 10 } });
    const result = await getLabRequestById(10, { signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/10', { signal });
    expect(result).toEqual({ id: 10 });
  });

  it('createLabRequest posts to /laboratory with the input', async () => {
    const input = { patient_id: 1, test_ids: [1, 2] };
    apiClient.post.mockResolvedValue({ data: { id: 7, ...input } });
    const result = await createLabRequest(input, { signal });
    expect(apiClient.post).toHaveBeenCalledWith('/laboratory', input, { signal });
    expect(result).toEqual({ id: 7, ...input });
  });

  it('updateLabRequest patches /laboratory/:id', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 7 } });
    await updateLabRequest(7, { notes: 'x' }, { signal });
    expect(apiClient.patch).toHaveBeenCalledWith('/laboratory/7', { notes: 'x' }, { signal });
  });

  it('deleteLabRequest calls DELETE /laboratory/:id', async () => {
    apiClient.delete.mockResolvedValue({});
    await deleteLabRequest(4, { signal });
    expect(apiClient.delete).toHaveBeenCalledWith('/laboratory/4', { signal });
  });

  it('cancelLabRequest calls DELETE /laboratory/:id', async () => {
    apiClient.delete.mockResolvedValue({});
    await cancelLabRequest(4, 'sin muestra', { signal });
    expect(apiClient.delete).toHaveBeenCalledWith('/laboratory/4', { signal });
  });

  it('cancelLabRequest sends no body when reason omitted', async () => {
    apiClient.delete.mockResolvedValue({});
    await cancelLabRequest(4);
    expect(apiClient.delete).toHaveBeenCalledWith('/laboratory/4', { signal: undefined });
  });

  it('updateLabRequestStatus patches /laboratory/:id/status', async () => {
    apiClient.patch.mockResolvedValue({ data: { status: 'processing' } });
    await updateLabRequestStatus(4, 'processing', { signal });
    expect(apiClient.patch).toHaveBeenCalledWith('/laboratory/4/status', { status: 'processing' }, { signal });
  });
});

describe('lab.service request items & results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getLabRequestItems calls GET /laboratory/:requestId and returns items', async () => {
    apiClient.get.mockResolvedValue({ data: { items: [{ id: 1 }] } });
    const result = await getLabRequestItems(12, { signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/12', { signal });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('addLabRequestItem posts to /laboratory with lab_request_id', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 3 } });
    await addLabRequestItem(12, { lab_test_id: 99, notes: 'urgente' }, { signal });
    expect(apiClient.post).toHaveBeenCalledWith('/laboratory', { lab_test_id: 99, notes: 'urgente', lab_request_id: 12 }, { signal });
  });

  it('updateLabRequestItem patches /laboratory/items/:itemId/result', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 3 } });
    await updateLabRequestItem(12, 3, { notes: 'ok' }, { signal });
    expect(apiClient.patch).toHaveBeenCalledWith('/laboratory/items/3/result', { notes: 'ok' }, { signal });
  });

  it('removeLabRequestItem deletes /laboratory/items/:itemId', async () => {
    apiClient.delete.mockResolvedValue({});
    await removeLabRequestItem(12, 3, { signal });
    expect(apiClient.delete).toHaveBeenCalledWith('/laboratory/items/3', { signal });
  });

  it('enterResult patches /laboratory/items/:itemId/result', async () => {
    const input = { result_value: '12.5', unit: 'mg/dL' };
    apiClient.patch.mockResolvedValue({ data: { id: 3, result_value: '12.5' } });
    const result = await enterResult(12, 3, input, { signal });
    expect(apiClient.patch).toHaveBeenCalledWith('/laboratory/items/3/result', input, { signal });
    expect(result.result_value).toBe('12.5');
  });

  it('updateResult patches /laboratory/items/:itemId/result', async () => {
    apiClient.patch.mockResolvedValue({ data: {} });
    await updateResult(12, 3, { result_value: '13.0' }, { signal });
    expect(apiClient.patch).toHaveBeenCalledWith('/laboratory/items/3/result', { result_value: '13.0' }, { signal });
  });

  it('validateTech patches /laboratory/items/:itemId/validate-tech', async () => {
    apiClient.patch.mockResolvedValue({ data: { validated_at_tech: 'x' } });
    await validateTech(12, 3, { notes: 'ok' }, { signal });
    expect(apiClient.patch).toHaveBeenCalledWith('/laboratory/items/3/validate-tech', { notes: 'ok' }, { signal });
  });

  it('validateDoctor patches /laboratory/items/:itemId/validate-doctor', async () => {
    apiClient.patch.mockResolvedValue({ data: {} });
    await validateDoctor(12, 3, { notes: 'ok' }, { signal });
    expect(apiClient.patch).toHaveBeenCalledWith('/laboratory/items/3/validate-doctor', { notes: 'ok' }, { signal });
  });

  it('signResult patches /laboratory/items/:itemId/sign', async () => {
    apiClient.patch.mockResolvedValue({ data: {} });
    await signResult(12, 3, { signal });
    expect(apiClient.patch).toHaveBeenCalledWith('/laboratory/items/3/sign', undefined, { signal });
  });

  it('deliverResult patches /laboratory/items/:itemId/deliver', async () => {
    apiClient.patch.mockResolvedValue({ data: {} });
    await deliverResult(12, 3, { method: 'print' }, { signal });
    expect(apiClient.patch).toHaveBeenCalledWith('/laboratory/items/3/deliver', { method: 'print' }, { signal });
  });
});

describe('lab.service samples', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSamples passes filters as params', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 1 }] });
    const params = { requestId: 5, status: 'received', areaId: 2 };
    await getSamples(params, { signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/samples', { params, signal });
  });

  it('getSampleById calls GET /laboratory/samples/:id', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 8 } });
    await getSampleById(8, { signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/samples/8', { signal });
  });

  it('createSample posts to /laboratory/samples', async () => {
    const input = { lab_request_item_id: 3, sample_type: 'blood', container_type: 'tube' };
    apiClient.post.mockResolvedValue({ data: { id: 8 } });
    await createSample(input, { signal });
    expect(apiClient.post).toHaveBeenCalledWith('/laboratory/samples', input, { signal });
  });

  it('updateSample patches /laboratory/samples/:id', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 8 } });
    await updateSample(8, { storage_location: 'R1' }, { signal });
    expect(apiClient.patch).toHaveBeenCalledWith('/laboratory/samples/8', { storage_location: 'R1' }, { signal });
  });

  it('receiveSample patches /laboratory/samples/:id/receive', async () => {
    apiClient.patch.mockResolvedValue({ data: { status: 'received' } });
    const result = await receiveSample(8, { signal });
    expect(apiClient.patch).toHaveBeenCalledWith('/laboratory/samples/8/receive', undefined, { signal });
    expect(result.status).toBe('received');
  });

  it('verifySample patches /laboratory/samples/:id/verify', async () => {
    apiClient.patch.mockResolvedValue({ data: {} });
    await verifySample(8, { signal });
    expect(apiClient.patch).toHaveBeenCalledWith('/laboratory/samples/8/verify', undefined, { signal });
  });

  it('rejectSample patches /laboratory/samples/:id/reject', async () => {
    apiClient.patch.mockResolvedValue({ data: { status: 'rejected' } });
    await rejectSample(8, 'hemolizada', { signal });
    expect(apiClient.patch).toHaveBeenCalledWith('/laboratory/samples/8/reject', { reason: 'hemolizada' }, { signal });
  });
});

describe('lab.service history, QC, equipment, reagents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getResultHistory calls GET /laboratory/items/:itemId/history', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 1 }] });
    await getResultHistory(50, 12, { signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/items/12/history', { signal });
  });

  it('getQCRecords passes params to /laboratory/qc', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await getQCRecords({ areaId: 1, type: 'internal' }, { signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/qc', { params: { areaId: 1, type: 'internal' }, signal });
  });

  it('createQCRecord posts to /laboratory/qc', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } });
    await createQCRecord({ control_name: 'C1' }, { signal });
    expect(apiClient.post).toHaveBeenCalledWith('/laboratory/qc', { control_name: 'C1' }, { signal });
  });

  it('updateQCRecord puts /laboratory/qc/:id', async () => {
    apiClient.put.mockResolvedValue({ data: {} });
    await updateQCRecord(1, { notes: 'x' }, { signal });
    expect(apiClient.put).toHaveBeenCalledWith('/laboratory/qc/1', { notes: 'x' }, { signal });
  });

  it('approveQCRecord posts to /laboratory/qc/:id/approve', async () => {
    apiClient.post.mockResolvedValue({ data: { status: 'passed' } });
    await approveQCRecord(1, { signal });
    expect(apiClient.post).toHaveBeenCalledWith('/laboratory/qc/1/approve', undefined, { signal });
  });

  it('getEquipment passes params', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await getEquipment({ areaId: 2 }, { signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/equipment', { params: { areaId: 2 }, signal });
  });

  it('createEquipment posts to /laboratory/equipment', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 2 } });
    await createEquipment({ name: 'Analyzer' }, { signal });
    expect(apiClient.post).toHaveBeenCalledWith('/laboratory/equipment', { name: 'Analyzer' }, { signal });
  });

  it('updateEquipment puts /laboratory/equipment/:id', async () => {
    apiClient.put.mockResolvedValue({ data: {} });
    await updateEquipment(2, { status: 'maintenance' }, { signal });
    expect(apiClient.put).toHaveBeenCalledWith('/laboratory/equipment/2', { status: 'maintenance' }, { signal });
  });

  it('getReagents passes params', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await getReagents({ areaId: 3 }, { signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/reagents', { params: { areaId: 3 }, signal });
  });

  it('createReagent posts to /laboratory/reagents', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 3 } });
    await createReagent({ name: 'Reactivo' }, { signal });
    expect(apiClient.post).toHaveBeenCalledWith('/laboratory/reagents', { name: 'Reactivo' }, { signal });
  });

  it('updateReagent patches /laboratory/reagents/:id/stock', async () => {
    apiClient.patch.mockResolvedValue({ data: {} });
    await updateReagent(3, { current_stock: 10 }, { signal });
    expect(apiClient.patch).toHaveBeenCalledWith('/laboratory/reagents/3/stock', { current_stock: 10 }, { signal });
  });
});

describe('lab.service areas, tests, analytics, notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getLabAreas calls GET /laboratory/areas', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 1 }] });
    await getLabAreas({ signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/areas', { signal });
  });

  it('getLabTests passes areaId param', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await getLabTests({ areaId: 2 }, { signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/tests', { params: { areaId: 2 }, signal });
  });

  it('getLabAnalytics passes date range params', async () => {
    apiClient.get.mockResolvedValue({ data: { daily: [] } });
    await getLabAnalytics({ dateFrom: '2026-01-01', dateTo: '2026-02-01' }, { signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/dashboard/analytics', {
      params: { dateFrom: '2026-01-01', dateTo: '2026-02-01' },
      signal,
    });
  });

  it('getLabAnalyticsByDoctor calls GET /laboratory/dashboard/analytics with doctor_id', async () => {
    apiClient.get.mockResolvedValue({ data: { doctor_name: 'Dr', count: 5, avg_time_min: 30 } });
    const result = await getLabAnalyticsByDoctor(9, { signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/dashboard/analytics', { params: { doctor_id: 9 }, signal });
    expect(result.count).toBe(5);
  });

  it('getLabNotifications calls GET /laboratory/notifications', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await getLabNotifications({ signal });
    expect(apiClient.get).toHaveBeenCalledWith('/laboratory/notifications', { signal });
  });

  it('acknowledgeNotification patches /laboratory/notifications/:id/ack', async () => {
    apiClient.patch.mockResolvedValue({ data: { acknowledged: true } });
    await acknowledgeNotification(4, { signal });
    expect(apiClient.patch).toHaveBeenCalledWith('/laboratory/notifications/4/ack', undefined, { signal });
  });

  it('acknowledgeAllNotifications posts to acknowledge-all', async () => {
    apiClient.post.mockResolvedValue({});
    await acknowledgeAllNotifications({ signal });
    expect(apiClient.post).toHaveBeenCalledWith('/laboratory/notifications/acknowledge-all', undefined, { signal });
  });
});

describe('lab.service SSE', () => {
  const EventSourceMock = vi.hoisted(() =>
    vi.fn(function (this: { url: string; onmessage: unknown; onerror: unknown }) {
      this.url = arguments[0];
      this.onmessage = null;
      this.onerror = null;
    }),
  );

  beforeEach(() => {
    EventSourceMock.mockClear();
    localStorage.removeItem('access_token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('subscribeToLabSSE creates an EventSource with the token when present', () => {
    localStorage.setItem('access_token', 'tok-123');
    vi.stubGlobal('EventSource', EventSourceMock as unknown as typeof EventSource);

    const onMessage = vi.fn();
    const es = subscribeToLabSSE(onMessage);

    expect(es).toBeInstanceOf(EventSourceMock);
    expect(EventSourceMock).toHaveBeenCalledTimes(1);
    expect(EventSourceMock.mock.calls[0][0]).toContain('/laboratory/events');
    expect(EventSourceMock.mock.calls[0][0]).toContain('token=tok-123');
    expect(es.onmessage).toBe(onMessage);
  });

  it('subscribeToLabSSE omits the token when not present', () => {
    localStorage.removeItem('access_token');
    vi.stubGlobal('EventSource', EventSourceMock as unknown as typeof EventSource);

    subscribeToLabSSE(vi.fn());
    expect(EventSourceMock.mock.calls[0][0]).not.toContain('token=');
  });
});

describe('lab.service label/color helpers', () => {
  it('getStatusLabel maps known statuses and falls back to raw status', () => {
    expect(getStatusLabel('pending')).toBe('Pendiente');
    expect(getStatusLabel('validated_tech')).toBe('Validado Técnico');
    expect(getStatusLabel('delivered')).toBe('Entregado');
    expect(getStatusLabel('unknown_status')).toBe('unknown_status');
  });

  it('getPriorityLabel maps known priorities and falls back', () => {
    expect(getPriorityLabel('urgent')).toBe('Urgente');
    expect(getPriorityLabel('emergency')).toBe('Emergencia');
    expect(getPriorityLabel('custom')).toBe('custom');
  });

  it('getStatusColor maps statuses to MUI colors with default fallback', () => {
    expect(getStatusColor('rejected')).toBe('error');
    expect(getStatusColor('delivered')).toBe('success');
    expect(getStatusColor('processing')).toBe('warning');
    expect(getStatusColor('whatever')).toBe('default');
  });

  it('getPriorityColor maps priorities with default fallback', () => {
    expect(getPriorityColor('emergency')).toBe('error');
    expect(getPriorityColor('normal')).toBe('info');
    expect(getPriorityColor('low')).toBe('default');
    expect(getPriorityColor('whatever')).toBe('default');
  });
});
