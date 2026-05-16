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
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql === 'COMMIT') return Promise.resolve({});
      if (sql.includes('INSERT INTO lab_requests')) return Promise.resolve({ rows: [{ id: 1, request_number: 'LAB-2026-00001' }] });
      if (sql.includes('SELECT id FROM lab_tests WHERE id')) return Promise.resolve({ rows: [{ id: 1 }] });
      if (sql.includes('INSERT INTO lab_request_items')) return Promise.resolve({ rows: [{ id: 1 }] });
      return Promise.resolve({ rows: [] });
    });

    const result = await labService.createLabRequest({
      patient_id: 1, doctor_id: 1, notes: 'Urgente', test_ids: [1, 2],
    });

    expect(result.id).toBe(1);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('rolls back if lab test not found', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('INSERT INTO lab_requests')) return Promise.resolve({ rows: [{ id: 1 }] });
      if (sql.includes('SELECT id FROM lab_tests WHERE id')) return Promise.resolve({ rows: [] });
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(labService.createLabRequest({
      patient_id: 1, test_ids: [999],
    })).rejects.toThrow();

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

describe('labService.getLabRequests', () => {
  it('returns lab requests with filters', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1, status: 'pending' }] });

    const result = await labService.getLabRequests({ patient_id: 1 });

    expect(result).toHaveLength(1);
  });

  it('returns empty array when no requests', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await labService.getLabRequests({});

    expect(result).toEqual([]);
  });
});

describe('labService.updateLabRequestStatus', () => {
  it('updates status successfully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'completed' }] });

    const result = await labService.updateLabRequestStatus(1, 'completed');

    expect(result.status).toBe('completed');
  });

  it('throws if request not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(labService.updateLabRequestStatus(999, 'completed')).rejects.toThrow('Lab request not found');
  });
});

describe('labService.getLabRequestById', () => {
  it('returns lab request by id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, request_number: 'LAB-2026-00001' }] });

    const result = await labService.getLabRequestById(1);

    expect(result.id).toBe(1);
  });

  it('throws if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(labService.getLabRequestById(999)).rejects.toThrow('Lab request not found');
  });
});

describe('labService.updateLabRequestItemResult', () => {
  it('updates item result', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, result_value: 'Positive', result_notes: 'Normal' }] });

    const result = await labService.updateLabRequestItemResult(1, 'Positive', 'Normal');

    expect(result.result_value).toBe('Positive');
  });

  it('throws if item not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(labService.updateLabRequestItemResult(999, 'Positive')).rejects.toThrow('Lab request item not found');
  });
});

describe('labService.cancelLabRequest', () => {
  it('cancels own request as patient', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'cancelled' }] });

    const result = await labService.cancelLabRequest(1, 1, 'user');

    expect(result.status).toBe('cancelled');
  });

  it('cancels any request as admin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 5 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'cancelled' }] });

    const result = await labService.cancelLabRequest(1, 1, 'admin');

    expect(result.status).toBe('cancelled');
  });

  it('throws access denied for other users', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 5 }] });

    await expect(labService.cancelLabRequest(1, 2, 'user')).rejects.toThrow('Access denied');
  });
});
