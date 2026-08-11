import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ClinicalRecord } from '@/modules/clinical-records/types/clinical-record.types';

const apiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import { clinicalRecordService } from '@/modules/clinical-records/services/clinical-record.service';

const record: ClinicalRecord = {
  id: 1,
  tenant_id: 1,
  patient_id: 10,
  doctor_id: 5,
  chief_complaint: 'Dolor de cabeza',
  diagnosis: 'Migraña',
  treatment: 'Reposo',
  patient_name: 'Maria Garcia',
  doctor_name: 'Dr. Perez',
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-01T10:00:00Z',
};

describe('clinicalRecordService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list: GETs /clinical-records with built params and spreads extra config', async () => {
    apiClient.get.mockResolvedValue({ data: { data: [record], total: 1, page: 1, limit: 10, totalPages: 1 } });
    const result = await clinicalRecordService.list({ page: 1, limit: 10, patient_id: 10, doctor_id: 5, search: 'migraña' }, { signal: undefined });
    expect(apiClient.get).toHaveBeenCalledWith('/clinical-records', {
      params: { page: 1, limit: 10, patient_id: 10, doctor_id: 5, search: 'migraña' },
      signal: undefined,
    });
    expect(result.data).toEqual([record]);
  });

  it('list: slices and paginates a plain array response', async () => {
    apiClient.get.mockResolvedValue({ data: [record, record] });
    const result = await clinicalRecordService.list({ page: 2, limit: 1 });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.page).toBe(2);
  });

  it('list: filters paginated data by search', async () => {
    const other: ClinicalRecord = {
      ...record,
      id: 2,
      diagnosis: 'Asma',
      chief_complaint: 'Tos',
      patient_name: 'Juan Soto',
    };
    apiClient.get.mockResolvedValue({ data: { data: [record, other], total: 2, page: 1, limit: 10, totalPages: 1 } });
    const result = await clinicalRecordService.list({ page: 1, limit: 10, search: 'migraña' });
    expect(result.total).toBe(1);
    expect(result.data[0]!.id).toBe(1);
  });

  it('list: returns empty result when search matches nothing', async () => {
    apiClient.get.mockResolvedValue({ data: { data: [record], total: 1, page: 1, limit: 10, totalPages: 1 } });
    const result = await clinicalRecordService.list({ page: 1, limit: 10, search: 'zzz' });
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('getById: GETs /clinical-records/:id', async () => {
    apiClient.get.mockResolvedValue({ data: record });
    const result = await clinicalRecordService.getById(1);
    expect(apiClient.get).toHaveBeenCalledWith('/clinical-records/1', undefined);
    expect(result.id).toBe(1);
  });

  it('getByPatient: GETs /clinical-records/patient/:id', async () => {
    apiClient.get.mockResolvedValue({ data: [record] });
    const result = await clinicalRecordService.getByPatient(10);
    expect(apiClient.get).toHaveBeenCalledWith('/clinical-records/patient/10', undefined);
    expect(result).toEqual([record]);
  });

  it('create: POSTs /clinical-records', async () => {
    apiClient.post.mockResolvedValue({ data: record });
    const input = {
      patient_id: 10,
      chief_complaint: 'Dolor de cabeza',
      diagnosis: 'Migraña',
      treatment: 'Reposo',
    };
    const result = await clinicalRecordService.create(input);
    expect(apiClient.post).toHaveBeenCalledWith('/clinical-records', input, undefined);
    expect(result).toEqual(record);
  });

  it('update: PATCHes /clinical-records/:id', async () => {
    apiClient.patch.mockResolvedValue({ data: { ...record, diagnosis: 'Migraña crónica' } });
    const result = await clinicalRecordService.update(1, { diagnosis: 'Migraña crónica' });
    expect(apiClient.patch).toHaveBeenCalledWith('/clinical-records/1', { diagnosis: 'Migraña crónica' }, undefined);
    expect(result.diagnosis).toBe('Migraña crónica');
  });

  it('remove: DELETEs /clinical-records/:id', async () => {
    apiClient.delete.mockResolvedValue({});
    await clinicalRecordService.remove(1);
    expect(apiClient.delete).toHaveBeenCalledWith('/clinical-records/1', undefined);
  });
});
