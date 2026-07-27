import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type {
  MedicalHistoryEntry,
  CreateMedicalHistoryInput,
  UpdateMedicalHistoryInput,
  MedicalHistoryListParams,
} from '../types/medical-history.types';

function buildParams(params: MedicalHistoryListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {};
  if (params.page) q.page = params.page;
  if (params.limit) q.limit = params.limit;
  if (params.patient_id) q.patient_id = params.patient_id;
  if (params.status) q.status = params.status;
  if (params.search) q.search = params.search;
  return q;
}

export const medicalHistoryService = {
  async list(
    params: MedicalHistoryListParams = {},
    opts?: { signal?: AbortSignal },
  ): Promise<PaginatedResponse<MedicalHistoryEntry>> {
    const { data } = await apiClient.get<MedicalHistoryEntry[] | PaginatedResponse<MedicalHistoryEntry>>(
      '/medical-history',
      { params: buildParams(params), signal: opts?.signal },
    );

    if (Array.isArray(data)) {
      return {
        data: data as MedicalHistoryEntry[],
        total: data.length,
        page: params.page || 1,
        limit: data.length,
        totalPages: 1,
      };
    }

    return data;
  },

  async getByPatient(patientId: number, opts?: { signal?: AbortSignal }): Promise<MedicalHistoryEntry[]> {
    const { data } = await apiClient.get<MedicalHistoryEntry[]>(
      `/medical-history/patient/${patientId}`,
      { signal: opts?.signal },
    );
    return data;
  },

  async create(input: CreateMedicalHistoryInput, opts?: { signal?: AbortSignal }): Promise<MedicalHistoryEntry> {
    const { data } = await apiClient.post<MedicalHistoryEntry>('/medical-history', input, { signal: opts?.signal });
    return data;
  },

  async update(id: number, input: UpdateMedicalHistoryInput, opts?: { signal?: AbortSignal }): Promise<MedicalHistoryEntry> {
    const { data } = await apiClient.patch<MedicalHistoryEntry>(`/medical-history/${id}`, input, { signal: opts?.signal });
    return data;
  },
};
