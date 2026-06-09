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
