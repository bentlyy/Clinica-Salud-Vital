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

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import * as prescriptionService from '../../src/modules/clinical-record/prescription.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
});

describe('prescriptionService.getPrescriptionsByClinicalRecord', () => {
  it('returns prescriptions for a clinical record', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, medication: 'Paracetamol', dosage: '500mg' }] });
    const result = await prescriptionService.getPrescriptionsByClinicalRecord(1);
    expect(result).toHaveLength(1);
    expect(result[0].medication).toBe('Paracetamol');
  });

  it('returns empty array when no prescriptions', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await prescriptionService.getPrescriptionsByClinicalRecord(999);
    expect(result).toEqual([]);
  });
});

describe('prescriptionService.getPrescriptionById', () => {
  it('returns prescription with joined data', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, medication: 'Ibuprofeno', patient_id: 1, doctor_id: 2 }] });
    const result = await prescriptionService.getPrescriptionById(1);
    expect(result.patient_id).toBe(1);
    expect(result.doctor_id).toBe(2);
  });

  it('throws if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(prescriptionService.getPrescriptionById(999)).rejects.toThrow('Prescription not found');
  });
});

describe('prescriptionService.createPrescription', () => {
  it('creates prescription in transaction', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, doctor_id')) return Promise.resolve({ rows: [{ id: 1, doctor_id: 5, status: 'draft' }] });
      if (sql.includes('INSERT INTO prescriptions')) return Promise.resolve({ rows: [{ id: 1, medication: 'Amoxicilina', dosage: '500mg', frequency: 'cada 8 horas', route: 'oral' }] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await prescriptionService.createPrescription({
      clinical_record_id: 1,
      medication: 'Amoxicilina',
      dosage: '500mg',
      frequency: 'cada 8 horas',
    }, 5);

    expect(result.medication).toBe('Amoxicilina');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('throws if clinical record not found', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, doctor_id')) return Promise.resolve({ rows: [] });
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(prescriptionService.createPrescription({
      clinical_record_id: 999,
      medication: 'Test',
      dosage: '10mg',
      frequency: 'daily',
    }, 5)).rejects.toThrow('Clinical record not found');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('throws if doctor does not own the record', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, doctor_id')) return Promise.resolve({ rows: [{ id: 1, doctor_id: 10, status: 'draft' }] });
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(prescriptionService.createPrescription({
      clinical_record_id: 1,
      medication: 'Test',
      dosage: '10mg',
      frequency: 'daily',
    }, 5)).rejects.toThrow('You can only add prescriptions to your own records');
  });
});

describe('prescriptionService.updatePrescription', () => {
  it('updates prescription fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, medication: 'Updated', dosage: '1000mg' }] });
    const result = await prescriptionService.updatePrescription(1, { medication: 'Updated', dosage: '1000mg' }, 5);
    expect(result.medication).toBe('Updated');
  });

  it('throws if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(prescriptionService.updatePrescription(999, { medication: 'X' }, 5)).rejects.toThrow('Prescription not found');
  });
});

describe('prescriptionService.deletePrescription', () => {
  it('deletes prescription', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const result = await prescriptionService.deletePrescription(1, 5);
    expect(result.message).toContain('deleted');
  });

  it('throws if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(prescriptionService.deletePrescription(999, 5)).rejects.toThrow('Prescription not found');
  });
});
