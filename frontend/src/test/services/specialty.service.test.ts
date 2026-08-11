import { describe, it, expect, vi, beforeEach } from 'vitest';
import { specialtyService } from '@/modules/specialties/services/specialty.service';
import { apiClient } from '@/shared/services/api-client';

vi.mock('@/shared/services/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mockedApi = vi.mocked(apiClient);

const specialty = {
  id: 1,
  tenant_id: 't1',
  name: 'Cardiología',
  description: 'Cuidado del corazón',
  icon: '🫀',
  department: 'Cardiología',
  procedures: ['Consulta'],
  color: '#1976D2',
  created_at: '2026-01-01T00:00:00Z',
};

describe('specialtyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list maps an array response and forwards the tenant_id param', async () => {
    mockedApi.get.mockResolvedValue({ data: [specialty] });
    const result = await specialtyService.list({ tenantId: 't1' });
    expect(mockedApi.get).toHaveBeenCalledWith('/specialties', {
      params: { tenant_id: 't1' },
      signal: undefined,
    });
    expect(result.data).toEqual([specialty]);
    expect(result.total).toBe(1);
  });

  it('list reads the data array from a paginated response', async () => {
    mockedApi.get.mockResolvedValue({ data: { data: [specialty], total: 1 } });
    const result = await specialtyService.list();
    expect(mockedApi.get).toHaveBeenCalledWith('/specialties', { params: undefined, signal: undefined });
    expect(result.data).toEqual([specialty]);
    expect(result.total).toBe(1);
  });

  it('list filters client-side by search over name and description', async () => {
    mockedApi.get.mockResolvedValue({
      data: [
        specialty,
        { ...specialty, id: 2, name: 'Pediatría', description: '' },
      ],
    });
    const result = await specialtyService.list({ search: 'cardio' });
    expect(result.data).toEqual([specialty]);
    expect(result.total).toBe(1);
  });

  it('getById fetches a single specialty with the signal', async () => {
    mockedApi.get.mockResolvedValue({ data: specialty });
    const signal = {} as AbortSignal;
    const result = await specialtyService.getById(1, { signal });
    expect(mockedApi.get).toHaveBeenCalledWith('/specialties/1', { signal });
    expect(result).toEqual(specialty);
  });

  it('create posts the body without tenant_id when no tenantId is provided', async () => {
    mockedApi.post.mockResolvedValue({ data: specialty });
    const result = await specialtyService.create({ name: 'Cardiología' });
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/specialties',
      { name: 'Cardiología' },
      { signal: undefined },
    );
    expect(result).toEqual(specialty);
  });

  it('create posts with tenant_id when tenantId is provided', async () => {
    mockedApi.post.mockResolvedValue({ data: specialty });
    await specialtyService.create({ name: 'Cardiología', tenantId: 't2' });
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/specialties',
      { name: 'Cardiología', tenant_id: 't2' },
      { signal: undefined },
    );
  });

  it('update puts the specialty and strips tenantId from the body', async () => {
    mockedApi.put.mockResolvedValue({ data: specialty });
    const result = await specialtyService.update(1, { name: 'Cardio 2', tenantId: 't2' });
    expect(mockedApi.put).toHaveBeenCalledWith(
      '/specialties/1',
      { name: 'Cardio 2', tenant_id: 't2' },
      { signal: undefined },
    );
    expect(result).toEqual(specialty);
  });

  it('remove deletes the specialty', async () => {
    mockedApi.delete.mockResolvedValue({ data: { message: 'ok' } });
    const result = await specialtyService.remove(1);
    expect(mockedApi.delete).toHaveBeenCalledWith('/specialties/1', { signal: undefined });
    expect(result).toEqual({ message: 'ok' });
  });
});
