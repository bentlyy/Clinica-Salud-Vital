import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type {
  Prescription,
  CreatePrescriptionInput,
  UpdatePrescriptionInput,
} from '../types/prescription.types';

export const prescriptionService = {
  async listAll(): Promise<PaginatedResponse<Prescription>> {
    const { data } = await apiClient.get<Prescription[]>('/clinical-records/prescriptions/all');
    const rows = Array.isArray(data) ? data : [];
    return {
      data: rows,
      total: rows.length,
      page: 1,
      limit: rows.length,
      totalPages: 1,
    };
  },

  async listByRecord(recordId: number): Promise<PaginatedResponse<Prescription>> {
    const { data } = await apiClient.get<PaginatedResponse<Prescription>>(`/clinical-records/${recordId}/prescriptions`);
    return data;
  },

  async create(input: CreatePrescriptionInput): Promise<Prescription> {
    const { data } = await apiClient.post<Prescription>('/clinical-records/prescriptions', input);
    return data;
  },

  async update(id: number, input: UpdatePrescriptionInput): Promise<Prescription> {
    const { data } = await apiClient.put<Prescription>(`/clinical-records/prescriptions/${id}`, input);
    return data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/clinical-records/prescriptions/${id}`);
  },
};
