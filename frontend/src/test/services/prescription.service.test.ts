import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Prescription } from '@/modules/prescriptions/types/prescription.types';

const apiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import { prescriptionService } from '@/modules/prescriptions/services/prescription.service';

const prescription: Prescription = {
  id: 1,
  tenant_id: 1,
  patient_id: 10,
  doctor_id: 5,
  medications: [{ name: 'Paracetamol', dosage: '500mg', frequency: 'cada 8h', duration: '7 dias' }],
  notes: 'Tomar con alimentos',
  doctor_name: 'Dr. Perez',
  patient_name: 'Maria Garcia',
  created_at: '2026-08-01T10:00:00Z',
};

describe('prescriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listAll: GETs /clinical-records/prescriptions/all and normalizes a plain array', async () => {
    apiClient.get.mockResolvedValue({ data: [prescription] });
    const result = await prescriptionService.listAll();
    expect(apiClient.get).toHaveBeenCalledWith('/clinical-records/prescriptions/all', { signal: undefined });
    expect(result).toEqual({
      data: [prescription],
      total: 1,
      page: 1,
      limit: 1,
      totalPages: 1,
    });
  });

  it('listAll: returns empty pagination when API returns a non-array', async () => {
    apiClient.get.mockResolvedValue({ data: null });
    const result = await prescriptionService.listAll();
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('listByRecord: GETs /clinical-records/:id/prescriptions', async () => {
    apiClient.get.mockResolvedValue({ data: { data: [prescription], total: 1, page: 1, limit: 10, totalPages: 1 } });
    const result = await prescriptionService.listByRecord(42);
    expect(apiClient.get).toHaveBeenCalledWith('/clinical-records/42/prescriptions', { signal: undefined });
    expect(result.data).toHaveLength(1);
  });

  it('create: POSTs /clinical-records/prescriptions', async () => {
    apiClient.post.mockResolvedValue({ data: prescription });
    const input = { patient_id: 10, medications: prescription.medications };
    const result = await prescriptionService.create(input);
    expect(apiClient.post).toHaveBeenCalledWith('/clinical-records/prescriptions', input, { signal: undefined });
    expect(result.id).toBe(1);
  });

  it('update: PUTs /clinical-records/prescriptions/:id', async () => {
    apiClient.put.mockResolvedValue({ data: prescription });
    const input = { notes: 'Actualizada' };
    const result = await prescriptionService.update(1, input);
    expect(apiClient.put).toHaveBeenCalledWith('/clinical-records/prescriptions/1', input, { signal: undefined });
    expect(result).toEqual(prescription);
  });

  it('remove: DELETEs /clinical-records/prescriptions/:id', async () => {
    apiClient.delete.mockResolvedValue({});
    await prescriptionService.remove(1);
    expect(apiClient.delete).toHaveBeenCalledWith('/clinical-records/prescriptions/1', { signal: undefined });
  });

  it('downloadPdf: fetches a blob and triggers a download link', async () => {
    const blob = new Blob(['pdf']);
    apiClient.get.mockResolvedValue({ data: blob });

    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });

    const click = vi.fn();
    const remove = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      setAttribute: vi.fn(),
      click,
      remove,
    } as unknown as HTMLAnchorElement);
    const appendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as never);

    await prescriptionService.downloadPdf(7);

    expect(apiClient.get).toHaveBeenCalledWith('/clinical-records/prescriptions/7/pdf', {
      responseType: 'blob',
      signal: undefined,
    });
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(appendChild).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
