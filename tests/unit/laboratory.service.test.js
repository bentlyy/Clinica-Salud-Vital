import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockClient, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockClient: { query: vi.fn(), release: vi.fn() },
  mockConnect: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: mockConnect,
    on: vi.fn(),
  },
}));

import * as labService from '../../src/modules/laboratory/laboratory.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
});

describe('labService.getLabTests', () => {
  it('returns all lab tests', async () => {
    const mockTests = [
      { id: 1, name: 'Hemograma', category: 'Hematología', active: true },
      { id: 2, name: 'Glucosa', category: 'Bioquímica', active: true },
    ];
    mockQuery.mockResolvedValueOnce({ rows: mockTests });

    const result = await labService.getLabTests({});

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Hemograma');
  });

  it('filters by category', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Hemograma', category: 'Hematología' }] });

    const result = await labService.getLabTests({ category: 'Hematología' });

    expect(result).toHaveLength(1);
  });

  it('filters by active status', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await labService.getLabTests({ active: true });

    expect(result).toEqual([]);
  });

  it('returns empty array when no tests', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await labService.getLabTests({});

    expect(result).toEqual([]);
  });
});

describe('labService.createLabRequest', () => {
  it('creates lab request with items in transaction', async () => {
    mockClient.query.mockImplementation((sql, params) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql === 'COMMIT') return Promise.resolve({});
      if (sql.includes('INSERT INTO lab_requests')) return Promise.resolve({ rows: [{ id: 1, request_number: 'LAB-2026-00001' }] });
      if (sql.includes('SELECT id FROM lab_tests WHERE id')) {
        const ids = Array.isArray(params?.[0]) ? params[0] : [params?.[0]];
        return Promise.resolve({ rows: ids.map((id) => ({ id })) });
      }
      if (sql.includes('INSERT INTO lab_request_items')) return Promise.resolve({ rows: [{ id: 1 }] });
      return Promise.resolve({ rows: [] });
    });

    const result = await labService.createLabRequest({
      patient_id: 1, doctor_id: 1, notes: 'Urgente', test_ids: [1, 2],
    }, 'test-tenant');

    expect(result.id).toBe(1);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('creates lab request with tenantId', async () => {
    mockClient.query.mockImplementation((sql, params) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql === 'COMMIT') return Promise.resolve({});
      if (sql.includes('INSERT INTO lab_requests')) return Promise.resolve({ rows: [{ id: 2, request_number: 'LAB-2026-00002' }] });
      if (sql.includes('SELECT id FROM lab_tests WHERE id')) {
        const ids = Array.isArray(params?.[0]) ? params[0] : [params?.[0]];
        return Promise.resolve({ rows: ids.map((id) => ({ id })) });
      }
      if (sql.includes('INSERT INTO lab_request_items')) return Promise.resolve({ rows: [{ id: 1 }] });
      return Promise.resolve({ rows: [] });
    });

    const result = await labService.createLabRequest({
      patient_id: 1, test_ids: [1],
    }, 'tenant-1');

    expect(result.id).toBe(2);
    expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('tenant_id'), expect.arrayContaining(['tenant-1']));
  });

  it('rolls back if lab test not found', async () => {
    mockClient.query.mockImplementation((sql, params) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('INSERT INTO lab_requests')) return Promise.resolve({ rows: [{ id: 1 }] });
      if (sql.includes('SELECT id FROM lab_tests WHERE id')) {
        const ids = Array.isArray(params?.[0]) ? params[0] : [params?.[0]];
        return Promise.resolve({ rows: ids.filter((id) => id !== 999).map((id) => ({ id })) });
      }
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(labService.createLabRequest({
      patient_id: 1, test_ids: [999],
    }, 'test-tenant')).rejects.toThrow();

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

describe('labService.getLabRequests', () => {
  it('returns lab requests with filters', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1, status: 'pending' }] });

    const result = await labService.getLabRequests({ patient_id: 1 }, 'test-tenant');

    expect(result).toHaveLength(1);
  });

  it('returns empty array when no requests', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await labService.getLabRequests({}, 'test-tenant');

    expect(result).toEqual([]);
  });

  it('filters by end_date', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, created_at: '2026-05-01' }] });
    const result = await labService.getLabRequests({ end_date: '2026-06-01' }, 'test-tenant');
    expect(result).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('created_at <='), expect.any(Array));
  });

  it('filters by tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const result = await labService.getLabRequests({}, 'tenant-1');
    expect(result).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id'), expect.arrayContaining(['tenant-1']));
  });

  it('filters by doctor_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, doctor_id: 1 }] });
    const result = await labService.getLabRequests({ doctor_id: 1 }, 'test-tenant');
    expect(result).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('doctor_id'), expect.arrayContaining([1]));
  });

  it('filters by status', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'pending' }] });
    const result = await labService.getLabRequests({ status: 'pending' }, 'test-tenant');
    expect(result).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('status'), expect.arrayContaining(['pending']));
  });

  it('filters by start_date', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const result = await labService.getLabRequests({ start_date: '2026-01-01' }, 'test-tenant');
    expect(result).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('created_at >='), expect.arrayContaining(['2026-01-01']));
  });
});

describe('labService.updateLabRequestStatus', () => {
  it('updates status successfully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'completed' }] });

    const result = await labService.updateLabRequestStatus(1, 'completed', 'test-tenant');

    expect(result.status).toBe('completed');
  });

  it('throws if request not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(labService.updateLabRequestStatus(999, 'completed', 'test-tenant')).rejects.toThrow('Lab request not found');
  });
});

describe('labService.getLabRequestById', () => {
  it('returns lab request by id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, request_number: 'LAB-2026-00001' }] });

    const result = await labService.getLabRequestById(1, 'test-tenant');

    expect(result.id).toBe(1);
  });

  it('throws if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(labService.getLabRequestById(999, 'test-tenant')).rejects.toThrow('Lab request not found');
  });
});

describe('labService.updateLabRequestItemResult', () => {
  it('updates item result', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, result_value: 'Positive', result_notes: 'Normal' }] });

    const result = await labService.updateLabRequestItemResult(1, 'Positive', 'test-tenant', 'Normal');

    expect(result.result_value).toBe('Positive');
  });

  it('throws if item not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(labService.updateLabRequestItemResult(999, 'Positive', 'test-tenant')).rejects.toThrow('Lab request item not found');
  });
});

describe('labService.cancelLabRequest', () => {
  it('cancels own request as patient', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'cancelled' }] });

    const result = await labService.cancelLabRequest(1, 1, 'user', 'test-tenant');

    expect(result.status).toBe('cancelled');
  });

  it('cancels any request as admin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 5 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'cancelled' }] });

    const result = await labService.cancelLabRequest(1, 1, 'admin', 'test-tenant');

    expect(result.status).toBe('cancelled');
  });

  it('throws access denied for other users', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 5 }] });

    await expect(labService.cancelLabRequest(1, 2, 'user', 'test-tenant')).rejects.toThrow('Access denied');
  });
});

describe('labService.getAllLabRequestsForLab', () => {
  it('returns all requests with items when no status filter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, patient_name: 'John', items: [{ id: 1, test_name: 'Glucosa' }] }] });

    const result = await labService.getAllLabRequestsForLab(undefined, 'test-tenant');

    expect(result).toHaveLength(1);
    expect(result[0].items[0].test_name).toBe('Glucosa');
  });

  it('filters by status', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, status: 'pending' }] });

    const result = await labService.getAllLabRequestsForLab('pending', 'test-tenant');

    expect(result).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('AND lr.status ='), expect.arrayContaining(['pending']));
  });

  it('returns empty array when no requests', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await labService.getAllLabRequestsForLab('completed', 'test-tenant');

    expect(result).toEqual([]);
  });
});

describe('labService.updateLabRequestItemStatus', () => {
  it('updates item status successfully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'in_progress' }] });

    const result = await labService.updateLabRequestItemStatus(1, 'in_progress', 'test-tenant');

    expect(result.status).toBe('in_progress');
  });

  it('throws if item not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(labService.updateLabRequestItemStatus(999, 'completed', 'test-tenant')).rejects.toThrow('Lab request item not found');
  });
});

describe('labService.setLabType', () => {
  it('sets lab_type to internal', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, lab_type: 'internal' }] });

    const result = await labService.setLabType(1, 'internal', 'test-tenant');

    expect(result.lab_type).toBe('internal');
  });

  it('sets lab_type to external', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, lab_type: 'external' }] });

    const result = await labService.setLabType(1, 'external', 'test-tenant');

    expect(result.lab_type).toBe('external');
  });

  it('throws for invalid lab_type', async () => {
    await expect(labService.setLabType(1, 'invalid', 'test-tenant')).rejects.toThrow('lab_type debe ser');
  });

  it('throws if request not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(labService.setLabType(999, 'internal', 'test-tenant')).rejects.toThrow('Lab request not found');
  });
});

describe('labService.checkFeatureAccess integration tests', () => {
  it('getAllLabRequestsForLab includes tenant_id in query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await labService.getAllLabRequestsForLab(undefined, 'custom-tenant');

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id'), expect.arrayContaining(['custom-tenant']));
  });

  it('updateLabRequestItemStatus includes tenant_id in query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'completed' }] });

    await labService.updateLabRequestItemStatus(1, 'completed', 'custom-tenant');

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id ='), expect.arrayContaining(['custom-tenant']));
  });

  it('setLabType includes tenant_id in query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, lab_type: 'internal' }] });

    await labService.setLabType(1, 'internal', 'custom-tenant');

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id ='), expect.arrayContaining(['custom-tenant']));
  });
});

describe('labService.getDashboardMetrics', () => {
  it('returns metrics with counts', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ pending: 5, received: 3, in_progress: 8, pending_validation: 2, validated: 10, delivered: 20, rejected: 1, repeated: 0, urgent: 2, critical_unvalidated: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ avg_minutes: 45.5 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 15 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ per_hour: 3 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 2 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 4 }] });

    const result = await labService.getDashboardMetrics('test-tenant');

    expect(result.pending).toBe(5);
    expect(result.urgent).toBe(2);
    expect(result.sla_breached).toBe(2);
    expect(mockQuery).toHaveBeenCalledTimes(6);
  });
});

describe('labService.getSamples', () => {
  it('returns samples for tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, sample_code: 'SMP-000001', sample_type: 'blood' }] });

    const result = await labService.getSamples('test-tenant');

    expect(result).toHaveLength(1);
    expect(result[0].sample_code).toBe('SMP-000001');
  });

  it('filters by status', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'received' }] });

    const result = await labService.getSamples('test-tenant', { status: 'received' });

    expect(result).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('AND status ='), expect.arrayContaining(['received']));
  });

  it('returns empty array', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await labService.getSamples('test-tenant');

    expect(result).toEqual([]);
  });
});

describe('labService.createSample', () => {
  it('creates sample and notification', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, sample_code: 'SMP-123456', sample_type: 'blood', lab_request_id: 5 }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await labService.createSample({ lab_request_id: 5, sample_type: 'blood', received_by: 1 }, 'test-tenant');

    expect(result.id).toBe(1);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});

describe('labService.receiveSample', () => {
  it('marks sample as received', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'received', received_by: 1 }] });

    const result = await labService.receiveSample(1, 1, 'test-tenant');

    expect(result.status).toBe('received');
  });

  it('throws if sample not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(labService.receiveSample(999, 1, 'test-tenant')).rejects.toThrow('Sample not found');
  });
});

describe('labService.verifySample', () => {
  it('marks sample as verified', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'verified', verified_by: 1 }] });

    const result = await labService.verifySample(1, 1, 'test-tenant');

    expect(result.status).toBe('verified');
  });
});

describe('labService.assignSample', () => {
  it('assigns sample to tech', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'assigned', assigned_tech_id: 1 }] });

    const result = await labService.assignSample(1, { assigned_tech_id: 1 }, 'test-tenant');

    expect(result.assigned_tech_id).toBe(1);
  });
});

describe('labService.recordSampleQC', () => {
  it('records qc passed', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, qc_status: 'passed' }] });

    const result = await labService.recordSampleQC(1, { qc_status: 'passed' }, 'test-tenant');

    expect(result.qc_status).toBe('passed');
  });

  it('creates notification when qc fails', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, qc_status: 'failed' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await labService.recordSampleQC(1, { qc_status: 'failed' }, 'test-tenant');

    expect(result.qc_status).toBe('failed');
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});

describe('labService.rejectSample', () => {
  it('rejects sample with reason', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'rejected', rejection_reason: 'Hemolyzed' }] });

    const result = await labService.rejectSample(1, 'Hemolyzed', 'test-tenant');

    expect(result.status).toBe('rejected');
  });
});

describe('labService.validateItemByTech', () => {
  it('validates item by technician', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'validated_tech', validated_by_tech: 1 }] });

    const result = await labService.validateItemByTech(1, 1, 'test-tenant');

    expect(result.status).toBe('validated_tech');
  });

  it('throws if item status invalid for tech validation', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(labService.validateItemByTech(1, 1, 'test-tenant')).rejects.toThrow('invalid status for tech validation');
  });
});

describe('labService.validateItemByDoctor', () => {
  it('validates item by doctor', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'validated_doctor', validated_by_doctor: 1 }] });

    const result = await labService.validateItemByDoctor(1, 1, 'test-tenant');

    expect(result.status).toBe('validated_doctor');
  });

  it('throws if not validated by tech first', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(labService.validateItemByDoctor(1, 1, 'test-tenant')).rejects.toThrow('must be validated by tech first');
  });
});

describe('labService.signItem', () => {
  it('signs item', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'signed', signed_by: 1 }] });

    const result = await labService.signItem(1, 1, 'test-tenant');

    expect(result.status).toBe('signed');
  });
});

describe('labService.deliverItem', () => {
  it('delivers item and updates request if all items delivered', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'delivered', lab_request_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await labService.deliverItem(1, 'test-tenant', 'print');

    expect(result.status).toBe('delivered');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE lab_requests SET status'), expect.any(Array));
  });
});

describe('labService.getLabAreas', () => {
  it('returns areas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Hematología', code: 'HEM' }] });

    const result = await labService.getLabAreas('test-tenant');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Hematología');
  });
});

describe('labService.createLabArea', () => {
  it('creates area', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'New Area', code: 'NEW' }] });

    const result = await labService.createLabArea({ name: 'New Area', code: 'NEW' }, 'test-tenant');

    expect(result.name).toBe('New Area');
  });
});

describe('labService.getQCRecords', () => {
  it('returns qc records', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'passed', control_name: 'Control A' }] });

    const result = await labService.getQCRecords('test-tenant');

    expect(result).toHaveLength(1);
  });

  it('filters by area_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, lab_area_id: 1 }] });

    const result = await labService.getQCRecords('test-tenant', { area_id: '1' });

    expect(result).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('lab_area_id ='), expect.arrayContaining([1]));
  });
});

describe('labService.createQCRecord', () => {
  it('creates qc record', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'passed', control_name: 'Control X' }] });

    const result = await labService.createQCRecord({
      lab_test_id: 1, lab_area_id: 1, qc_type: 'internal',
      control_name: 'Control X', lot_number: 'LOT-001',
      measured_value: 100, expected_min: 90, expected_max: 110,
      status: 'passed', performed_by: 1,
    }, 'test-tenant');

    expect(result.status).toBe('passed');
  });

  it('creates notification when qc fails', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'failed', control_name: 'Control Y' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await labService.createQCRecord({
      lab_test_id: 1, lab_area_id: 1, qc_type: 'internal',
      control_name: 'Control Y', lot_number: 'LOT-002',
      measured_value: 200, expected_min: 90, expected_max: 110,
      status: 'failed', performed_by: 1,
    }, 'test-tenant');

    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});

describe('labService.getQCStatistics', () => {
  it('returns stats', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 10, passed: 8, failed: 1, warning: 1 }] });

    const result = await labService.getQCStatistics('test-tenant');

    expect(result.total).toBe(10);
    expect(result.passed).toBe(8);
  });
});

describe('labService.getEquipment', () => {
  it('returns equipment list', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Hematology Analyzer', area_name: 'Hematología' }] });

    const result = await labService.getEquipment('test-tenant');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Hematology Analyzer');
  });
});

describe('labService.createEquipment', () => {
  it('creates equipment', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'New Equipment' }] });

    const result = await labService.createEquipment({ name: 'New Equipment' }, 'test-tenant');

    expect(result.name).toBe('New Equipment');
  });
});

describe('labService.updateEquipment', () => {
  it('updates equipment fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Updated', active: false }] });

    const result = await labService.updateEquipment(1, { name: 'Updated', active: false }, 'test-tenant');

    expect(result.name).toBe('Updated');
  });

  it('throws if no fields to update', async () => {
    await expect(labService.updateEquipment(1, {}, 'test-tenant')).rejects.toThrow('No fields to update');
  });
});

describe('labService.getReagents', () => {
  it('returns reagents list', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Reagent A' }] });

    const result = await labService.getReagents('test-tenant');

    expect(result).toHaveLength(1);
  });
});

describe('labService.createReagent', () => {
  it('creates reagent', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'New Reagent', current_stock: 100 }] });

    const result = await labService.createReagent({ name: 'New Reagent', stock_quantity: 100 }, 'test-tenant');

    expect(result.name).toBe('New Reagent');
  });
});

describe('labService.updateReagentStock', () => {
  it('updates stock and alerts if low', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Reagent A', current_stock: 5, min_stock: 10 }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await labService.updateReagentStock(1, 5, 'test-tenant');

    expect(result.current_stock).toBe(5);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('throws if reagent not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(labService.updateReagentStock(999, 5, 'test-tenant')).rejects.toThrow('Reagent not found');
  });
});

describe('labService.getNotifications', () => {
  it('returns notifications', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, type: 'qc_failure', acknowledged: false }] });

    const result = await labService.getNotifications('test-tenant');

    expect(result).toHaveLength(1);
  });

  it('filters unacknowledged', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, acknowledged: false }] });

    const result = await labService.getNotifications('test-tenant', { acknowledged: 'false' });

    expect(result).toHaveLength(1);
  });
});

describe('labService.acknowledgeNotification', () => {
  it('acknowledges notification', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, acknowledged: true, acknowledged_by: 1 }] });

    const result = await labService.acknowledgeNotification(1, 1, 'test-tenant');

    expect(result.acknowledged).toBe(true);
  });

  it('throws if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(labService.acknowledgeNotification(999, 1, 'test-tenant')).rejects.toThrow('Notification not found');
  });
});

describe('labService.createLabTest', () => {
  it('creates a lab test', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Hemoglobina', code: 'HGB' }] });

    const result = await labService.createLabTest({ name: 'Hemoglobina', code: 'HGB' }, 'test-tenant');

    expect(result.name).toBe('Hemoglobina');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO lab_tests'), expect.any(Array));
  });

  it('throws if name is missing', async () => {
    await expect(labService.createLabTest({ code: 'HGB' }, 'test-tenant')).rejects.toThrow('Test name is required');
  });
});

describe('labService.updateLabTest', () => {
  it('updates lab test fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Hemoglobina Actualizada', active: true }] });

    const result = await labService.updateLabTest(1, { name: 'Hemoglobina Actualizada' }, 'test-tenant');

    expect(result.name).toBe('Hemoglobina Actualizada');
  });

  it('throws if no fields to update', async () => {
    await expect(labService.updateLabTest(1, {}, 'test-tenant')).rejects.toThrow('No fields to update');
  });

  it('throws if test not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(labService.updateLabTest(999, { name: 'New Name' }, 'test-tenant')).rejects.toThrow('Lab test not found');
  });
});

describe('labService.deleteLabTest', () => {
  it('deletes lab test', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    await labService.deleteLabTest(1, 'test-tenant');

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM lab_tests'), [1, 'test-tenant']);
  });

  it('throws if test not found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    await expect(labService.deleteLabTest(999, 'test-tenant')).rejects.toThrow('Lab test not found');
  });
});

describe('labService.getAreaDashboard', () => {
  it('returns area dashboard with metrics and recent items', async () => {
    mockQuery.mockResolvedValue({ rows: [{ pending: 3, received: 1, in_progress: 5, pending_validation: 0, validated: 2, delivered: 4, rejected: 0, repeated: 0, urgent: 0, critical_unvalidated: 0 }] });

    const result = await labService.getAreaDashboard('test-tenant', 1);

    expect(result).toHaveProperty('metrics');
    expect(result).toHaveProperty('recent_items');
    expect(mockQuery).toHaveBeenCalledTimes(8);
  });

  it('throws if area not found', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('lab_areas')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [{ pending: 0, received: 0, in_progress: 0, pending_validation: 0, validated: 0, delivered: 0, rejected: 0, repeated: 0, urgent: 0, critical_unvalidated: 0 }] });
    });

    await expect(labService.getAreaDashboard('test-tenant', 999)).rejects.toThrow('Area not found');
  });
});

describe('labService.getAnalyticsData', () => {
  it('returns analytics data', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ date: '2026-06-01', count: 5, completed: 3 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ month: '2026-06', count: 20, completed: 15 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ doctor_name: 'Dr. Perez', count: 10 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ area_name: 'Hematología', count: 8, avg_time_min: 45 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ test_name: 'Glucosa', count: 30 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 5000 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ repeats: 2, total: 100 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ met: 90, total: 100 }] });

    const result = await labService.getAnalyticsData('test-tenant');

    expect(result.daily).toHaveLength(1);
    expect(result.total_revenue).toBe(5000);
    expect(mockQuery).toHaveBeenCalledTimes(8);
  });

  it('handles empty data', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ repeats: 0, total: 0 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ met: 0, total: 0 }] });

    const result = await labService.getAnalyticsData('test-tenant');

    expect(result.daily).toEqual([]);
    expect(result.total_revenue).toBe(0);
  });
});

describe('labService.getSampleById', () => {
  it('returns sample by id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, sample_code: 'SMP-123', sample_type: 'blood' }] });

    const result = await labService.getSampleById(1, 'test-tenant');

    expect(result.id).toBe(1);
    expect(result.sample_code).toBe('SMP-123');
  });

  it('throws if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(labService.getSampleById(999, 'test-tenant')).rejects.toThrow('Sample not found');
  });
});

describe('labService.getItemHistory', () => {
  it('returns item history with delta calculations', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ lab_test_id: 1, patient_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [
      { id: 3, result_value: '120', checked_at: '2026-06-03', previous_result_value: '110' },
      { id: 2, result_value: '110', checked_at: '2026-06-02', previous_result_value: '100' },
      { id: 1, result_value: '100', checked_at: '2026-06-01', previous_result_value: null },
    ] });

    const result = await labService.getItemHistory(1, 'test-tenant');

    expect(result).toHaveLength(3);
    expect(result[0].delta_percentage).toBeDefined();
  });

  it('throws if item not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(labService.getItemHistory(999, 'test-tenant')).rejects.toThrow('Item not found');
  });
});
