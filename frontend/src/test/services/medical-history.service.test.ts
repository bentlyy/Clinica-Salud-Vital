import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MedicalHistoryEntry } from '@/modules/medical-history/types/medical-history.types';

const apiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import { medicalHistoryService } from '@/modules/medical-history/services/medical-history.service';

const entry: MedicalHistoryEntry = {
  id: 1,
  tenant_id: 't1',
  patient_id: 10,
  patient_name: 'Maria Garcia',
  condition: 'Hipertensión',
  onset_date: '2025-01-01',
  status: 'active',
  notes: 'Control mensual',
  created_at: '2026-08-01T10:00:00Z',
};

describe('medicalHistoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list: GETs /medical-history with built params', async () => {
    apiClient.get.mockResolvedValue({ data: { data: [entry], total: 1, page: 1, limit: 10, totalPages: 1 } });
    const result = await medicalHistoryService.list({ page: 1, limit: 10, patient_id: 10, status: 'active', search: 'hiper' });
    expect(apiClient.get).toHaveBeenCalledWith('/medical-history', {
      params: { page: 1, limit: 10, patient_id: 10, status: 'active', search: 'hiper' },
      signal: undefined,
    });
    expect(result.data).toEqual([entry]);
  });

  it('list: omits empty params', async () => {
    apiClient.get.mockResolvedValue({ data: { data: [], total: 0, page: 1, limit: 10, totalPages: 0 } });
    await medicalHistoryService.list({});
    expect(apiClient.get).toHaveBeenCalledWith('/medical-history', { params: {}, signal: undefined });
  });

  it('list: wraps a plain array response into a paginated shape', async () => {
    apiClient.get.mockResolvedValue({ data: [entry] });
    const result = await medicalHistoryService.list({ page: 2 });
    expect(result).toEqual({
      data: [entry],
      total: 1,
      page: 2,
      limit: 1,
      totalPages: 1,
    });
  });

  it('getByPatient: GETs /medical-history/patient/:id', async () => {
    apiClient.get.mockResolvedValue({ data: [entry] });
    const result = await medicalHistoryService.getByPatient(10);
    expect(apiClient.get).toHaveBeenCalledWith('/medical-history/patient/10', { signal: undefined });
    expect(result).toEqual([entry]);
  });

  it('create: POSTs /medical-history with input', async () => {
    apiClient.post.mockResolvedValue({ data: entry });
    const input = { patient_id: 10, condition: 'Hipertensión', status: 'active' as const };
    const result = await medicalHistoryService.create(input);
    expect(apiClient.post).toHaveBeenCalledWith('/medical-history', input, { signal: undefined });
    expect(result.id).toBe(1);
  });

  it('update: PATCHes /medical-history/:id', async () => {
    apiClient.patch.mockResolvedValue({ data: { ...entry, notes: 'Nueva nota' } });
    const result = await medicalHistoryService.update(1, { notes: 'Nueva nota' });
    expect(apiClient.patch).toHaveBeenCalledWith('/medical-history/1', { notes: 'Nueva nota' }, { signal: undefined });
    expect(result.notes).toBe('Nueva nota');
  });
});
