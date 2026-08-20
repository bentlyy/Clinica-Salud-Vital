import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
  readPool: { query: mockQuery },
}));

import * as mhService from '../../src/modules/medical-history/medical-history.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('mhService.getAllMedicalHistory', () => {
  it('returns all records with tenant filter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, condition: 'Hipertensión' }, { id: 2, condition: 'Diabetes' }] });

    const result = await mhService.getAllMedicalHistory({}, 'tenant-1');

    expect(result).toHaveLength(2);
    expect(result[0].condition).toBe('Hipertensión');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('mh.tenant_id = $1'),
      expect.arrayContaining(['tenant-1'])
    );
  });

  it('filters by patient_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 7 }] });

    const result = await mhService.getAllMedicalHistory({ patient_id: 7 }, 'tenant-1');

    expect(result).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('mh.patient_id = $2'),
      expect.arrayContaining([7])
    );
  });

  it('filters by status', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'active' }] });

    const result = await mhService.getAllMedicalHistory({ status: 'active' }, 'tenant-1');

    expect(result).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('mh.status = $'),
      expect.arrayContaining(['active'])
    );
  });

  it('filters by search term with ILIKE', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, condition: 'Fiebre reumática' }] });

    const result = await mhService.getAllMedicalHistory({ search: 'fiebre' }, 'tenant-1');

    expect(result).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('mh.condition ILIKE'),
      expect.arrayContaining(['%fiebre%'])
    );
  });

  it('combines all filters and pagination values', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await mhService.getAllMedicalHistory(
      { patient_id: 3, status: 'chronic', search: 'asma', limit: 25, offset: 50 },
      'tenant-9'
    );

    const [, values] = mockQuery.mock.calls[0];
    expect(values).toEqual(['tenant-9', 3, 'chronic', '%asma%', 25, 50]);
    expect(mockQuery.mock.calls[0][0]).toContain('WHERE');
    expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY mh.created_at DESC');
  });

  it('uses default limit 100 and offset 0', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await mhService.getAllMedicalHistory({}, 'tenant-1');

    expect(mockQuery.mock.calls[0][1]).toEqual(['tenant-1', 100, 0]);
  });

  it('works without tenantId (superadmin) and without conditions', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await mhService.getAllMedicalHistory({}, undefined);

    expect(result).toEqual([]);
    expect(mockQuery.mock.calls[0][0]).not.toContain('WHERE');
    expect(mockQuery.mock.calls[0][1]).toEqual([100, 0]);
  });
});

describe('mhService.getMedicalHistoryById', () => {
  it('returns the record by id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 5, condition: 'Asma', patient_name: 'Ana' }] });

    const result = await mhService.getMedicalHistoryById(5, 'tenant-1');

    expect(result.id).toBe(5);
    expect(result.patient_name).toBe('Ana');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE mh.id = $1 AND mh.tenant_id = $2'),
      [5, 'tenant-1']
    );
  });

  it('throws Medical history entry not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(mhService.getMedicalHistoryById(999, 'tenant-1')).rejects.toThrow('Medical history entry not found');
  });
});

describe('mhService.createMedicalHistory', () => {
  it('creates a record with all fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 2, condition: 'Migraña' }] });

    const result = await mhService.createMedicalHistory(
      { patient_id: 2, condition: 'Migraña', onset_date: '2026-01-10', status: 'active', notes: 'Crisis frecuentes' },
      'tenant-1'
    );

    expect(result.id).toBe(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO medical_history'),
      [2, 'Migraña', '2026-01-10', 'active', 'Crisis frecuentes', 'tenant-1']
    );
  });

  it('creates a record with nulls for optional fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }] });

    const result = await mhService.createMedicalHistory(
      { patient_id: 2, condition: 'Migraña', status: 'active' },
      'tenant-1'
    );

    expect(result.id).toBe(2);
    expect(mockQuery.mock.calls[0][1]).toEqual([2, 'Migraña', null, 'active', null, 'tenant-1']);
  });
});

describe('mhService.updateMedicalHistory', () => {
  it('updates the record with COALESCE logic', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, condition: 'Migraña crónica', status: 'chronic' }] });

    const result = await mhService.updateMedicalHistory(
      1,
      { condition: 'Migraña crónica', status: 'chronic' },
      'tenant-1'
    );

    expect(result.condition).toBe('Migraña crónica');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('condition = COALESCE($1, condition)'),
      ['Migraña crónica', undefined, 'chronic', undefined, 1, 'tenant-1']
    );
  });

  it('throws Medical history entry not found when updating missing record', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(
      mhService.updateMedicalHistory(999, { condition: 'X' }, 'tenant-1')
    ).rejects.toThrow('Medical history entry not found');
  });
});
