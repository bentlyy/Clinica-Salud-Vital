import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type {
  Prescription,
  CreatePrescriptionInput,
  UpdatePrescriptionInput,
} from '../types/prescription.types';

export const prescriptionService = {
  async listAll(opts?: { signal?: AbortSignal }): Promise<PaginatedResponse<Prescription>> {
    const { data } = await apiClient.get<Prescription[]>('/clinical-records/prescriptions/all', { signal: opts?.signal });
    const rows = Array.isArray(data) ? data : [];
    return {
      data: rows,
      total: rows.length,
      page: 1,
      limit: rows.length,
      totalPages: 1,
    };
  },

  async listByRecord(recordId: number, opts?: { signal?: AbortSignal }): Promise<PaginatedResponse<Prescription>> {
    const { data } = await apiClient.get<PaginatedResponse<Prescription>>(`/clinical-records/${recordId}/prescriptions`, { signal: opts?.signal });
    return data;
  },

  async create(input: CreatePrescriptionInput, opts?: { signal?: AbortSignal }): Promise<Prescription> {
    const { data } = await apiClient.post<Prescription>('/clinical-records/prescriptions', input, { signal: opts?.signal });
    return data;
  },

  async update(id: number, input: UpdatePrescriptionInput, opts?: { signal?: AbortSignal }): Promise<Prescription> {
    const { data } = await apiClient.put<Prescription>(`/clinical-records/prescriptions/${id}`, input, { signal: opts?.signal });
    return data;
  },

  async remove(id: number, opts?: { signal?: AbortSignal }): Promise<void> {
    await apiClient.delete(`/clinical-records/prescriptions/${id}`, { signal: opts?.signal });
  },

  async downloadPdf(id: number, opts?: { signal?: AbortSignal }): Promise<void> {
    const response = await apiClient.get(`/clinical-records/prescriptions/${id}/pdf`, {
      responseType: 'blob',
      signal: opts?.signal,
    });
    const url = window.URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `receta-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
