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

import * as clinicalRecordService from '../../src/modules/clinical-record/clinical-record.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
});

describe('clinicalRecordService.getAllClinicalRecords', () => {
  it('returns all records with default pagination', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, doctor_name: 'Dr. Test', status: 'completed' }] });
    const result = await clinicalRecordService.getAllClinicalRecords();
    expect(result).toHaveLength(1);
  });

  it('filters by patient_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await clinicalRecordService.getAllClinicalRecords({ patient_id: 1 });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('cr.patient_id = $2'), expect.any(Array));
  });

  it('filters by doctor_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await clinicalRecordService.getAllClinicalRecords({ doctor_id: 2 });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('cr.doctor_id = $2'), expect.any(Array));
  });

  it('filters by status', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await clinicalRecordService.getAllClinicalRecords({ status: 'draft' });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('cr.status'), expect.any(Array));
  });

  it('filters by tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await clinicalRecordService.getAllClinicalRecords({}, 'tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('cr.tenant_id'), expect.any(Array));
  });
});

describe('clinicalRecordService.getClinicalRecordById', () => {
  it('returns record by id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, doctor_name: 'Dr. Test', patient_email: 'patient@test.com' }] });
    const result = await clinicalRecordService.getClinicalRecordById(1);
    expect(result.id).toBe(1);
  });

  it('throws if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(clinicalRecordService.getClinicalRecordById(999)).rejects.toThrow('Clinical record not found');
  });

  it('filters by tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(clinicalRecordService.getClinicalRecordById(1, 'tenant-1')).rejects.toThrow('Clinical record not found');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('cr.tenant_id'), expect.any(Array));
  });
});

describe('clinicalRecordService.getClinicalRecordsByPatient', () => {
  it('returns records for patient', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, doctor_name: 'Dr. Test' }] });
    const result = await clinicalRecordService.getClinicalRecordsByPatient(1);
    expect(result).toHaveLength(1);
  });

  it('filters by tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await clinicalRecordService.getClinicalRecordsByPatient(1, 'tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id'), expect.any(Array));
  });
});

describe('clinicalRecordService.createClinicalRecord', () => {
  it('creates record with all fields', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id FROM users')) return Promise.resolve({ rows: [{ id: 1 }] });
      if (sql.includes('SELECT id FROM bookings')) return Promise.resolve({ rows: [{ id: 10 }] });
      if (sql.includes('INSERT INTO clinical_records')) return Promise.resolve({ rows: [{ id: 1, chief_complaint: 'Dolor de cabeza' }] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await clinicalRecordService.createClinicalRecord({
      patient_id: 1,
      doctor_id: 2,
      booking_id: 10,
      chief_complaint: 'Dolor de cabeza',
      diagnosis: 'Migraña',
    }, 'test-tenant');

    expect(result.chief_complaint).toBe('Dolor de cabeza');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('throws if patient not found', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id FROM users')) return Promise.resolve({ rows: [] });
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(clinicalRecordService.createClinicalRecord({
      patient_id: 999,
      doctor_id: 2,
      chief_complaint: 'Test',
    }, 'tenant-1')).rejects.toThrow('Patient not found');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('creates record with vital_signs and tenantId', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id FROM users')) return Promise.resolve({ rows: [{ id: 1 }] });
      if (sql.includes('INSERT INTO clinical_records')) return Promise.resolve({ rows: [{ id: 1, vital_signs: '{"pressure":"120/80","heartRate":70}' }] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await clinicalRecordService.createClinicalRecord({
      patient_id: 1,
      doctor_id: 2,
      chief_complaint: 'Dolor',
      vital_signs: { pressure: '120/80', heartRate: 70 },
    }, 'tenant-1');

    expect(result.id).toBe(1);
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('tenant_id'),
      expect.arrayContaining(['tenant-1'])
    );
  });

  it('throws if booking not found', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id FROM users')) return Promise.resolve({ rows: [{ id: 1 }] });
      if (sql.includes('SELECT id FROM bookings')) return Promise.resolve({ rows: [] });
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(clinicalRecordService.createClinicalRecord({
      patient_id: 1,
      doctor_id: 2,
      booking_id: 999,
      chief_complaint: 'Test',
    }, 'test-tenant')).rejects.toThrow('Booking not found');
  });
});

describe('clinicalRecordService.updateClinicalRecord', () => {
  it('updates record fields', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, doctor_id, status')) return Promise.resolve({ rows: [{ id: 1, doctor_id: 5, status: 'draft' }] });
      if (sql.includes('UPDATE clinical_records')) return Promise.resolve({ rows: [{ id: 1, diagnosis: 'Nuevo diagnóstico' }] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await clinicalRecordService.updateClinicalRecord(1, { diagnosis: 'Nuevo diagnóstico' }, 5, 'test-tenant');
    expect(result.diagnosis).toBe('Nuevo diagnóstico');
  });

  it('throws if not found', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, doctor_id, status')) return Promise.resolve({ rows: [] });
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(clinicalRecordService.updateClinicalRecord(999, { diagnosis: 'X' }, 5, 'test-tenant')).rejects.toThrow('Clinical record not found');
  });

  it('throws if doctor does not own record', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, doctor_id, status')) return Promise.resolve({ rows: [{ id: 1, doctor_id: 10, status: 'draft' }] });
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(clinicalRecordService.updateClinicalRecord(1, { diagnosis: 'X' }, 5, 'test-tenant')).rejects.toThrow('You can only update your own records');
  });

  it('throws if status is completed', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, doctor_id, status')) return Promise.resolve({ rows: [{ id: 1, doctor_id: 5, status: 'completed' }] });
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(clinicalRecordService.updateClinicalRecord(1, { diagnosis: 'X' }, 5, 'test-tenant')).rejects.toThrow('Cannot update a completed record');
  });

  it('updates with vital_signs and tenantId', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, doctor_id, status')) return Promise.resolve({ rows: [{ id: 1, doctor_id: 5, status: 'draft' }] });
      if (sql.includes('UPDATE clinical_records')) return Promise.resolve({ rows: [{ id: 1, vital_signs: '{"temperature":37}' }] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await clinicalRecordService.updateClinicalRecord(1, { vital_signs: { temperature: 37 } }, 5, 'tenant-1');
    expect(result.id).toBe(1);
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('tenant_id'),
      expect.arrayContaining(['tenant-1'])
    );
  });

  it('throws if no fields to update', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, doctor_id, status')) return Promise.resolve({ rows: [{ id: 1, doctor_id: 5, status: 'draft' }] });
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(clinicalRecordService.updateClinicalRecord(1, {}, 5, 'test-tenant')).rejects.toThrow('No fields to update');
  });
});

describe('clinicalRecordService.deleteClinicalRecord', () => {
  it('cancels draft clinical record', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'cancelled' }] });
    const result = await clinicalRecordService.deleteClinicalRecord(1, 5, 'test-tenant');
    expect(result.message).toContain('cancelled');
  });

  it('throws if not found or cant be deleted', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(clinicalRecordService.deleteClinicalRecord(999, 5, 'test-tenant')).rejects.toThrow('Clinical record not found');
  });

  it('filters by tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(clinicalRecordService.deleteClinicalRecord(1, 5, 'tenant-1')).rejects.toThrow();
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id'), expect.any(Array));
  });
});

describe('clinicalRecordService.doesDoctorHaveBookingWithPatient', () => {
  it('returns true when booking exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const result = await clinicalRecordService.doesDoctorHaveBookingWithPatient(1, 2, 'test-tenant');
    expect(result).toBe(true);
  });

  it('returns false when no booking exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await clinicalRecordService.doesDoctorHaveBookingWithPatient(1, 999, 'test-tenant');
    expect(result).toBe(false);
  });
});
