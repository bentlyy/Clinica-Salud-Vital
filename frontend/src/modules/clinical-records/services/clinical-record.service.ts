import type { AxiosRequestConfig } from 'axios';
import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type {
  ClinicalRecord,
  CreateClinicalRecordInput,
  UpdateClinicalRecordInput,
  ClinicalRecordListParams,
} from '../types/clinical-record.types';

function buildParams(params: ClinicalRecordListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {};
  if (params.page) q.page = params.page;
  if (params.limit) q.limit = params.limit;
  if (params.patient_id) q.patient_id = params.patient_id;
  if (params.doctor_id) q.doctor_id = params.doctor_id;
  if (params.search) q.search = params.search;
  if (params.date_from) q.date_from = params.date_from;
  if (params.date_to) q.date_to = params.date_to;
  return q;
}

export const clinicalRecordService = {
  async list(params: ClinicalRecordListParams = {}, config?: AxiosRequestConfig): Promise<PaginatedResponse<ClinicalRecord>> {
    const { data } = await apiClient.get<ClinicalRecord[] | PaginatedResponse<ClinicalRecord>>('/clinical-records', {
      params: buildParams(params),
      ...config,
    });

    const page = params.page || 1;
    const limit = params.limit || 10;

    if (Array.isArray(data)) {
      const total = data.length;
      const start = (page - 1) * limit;
      const sliced = data.slice(start, start + limit);
      return {
        data: sliced as ClinicalRecord[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      const filtered = (data.data ?? []).filter(
        (r: ClinicalRecord) =>
          (r.patient_name || '').toLowerCase().includes(searchLower) ||
          (r.diagnosis || '').toLowerCase().includes(searchLower) ||
          (r.chief_complaint || '').toLowerCase().includes(searchLower),
      );
      const total = filtered.length;
      const start = (page - 1) * limit;
      return {
        data: filtered.slice(start, start + limit),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    return data;
  },

  async getById(id: number, config?: AxiosRequestConfig): Promise<ClinicalRecord> {
    const { data } = await apiClient.get<ClinicalRecord>(`/clinical-records/${id}`, config);
    return data;
  },

  async getByPatient(patientId: number, config?: AxiosRequestConfig): Promise<ClinicalRecord[]> {
    const { data } = await apiClient.get<ClinicalRecord[]>(
      `/clinical-records/patient/${patientId}`,
      config,
    );
    return data;
  },

  async create(input: CreateClinicalRecordInput, config?: AxiosRequestConfig): Promise<ClinicalRecord> {
    const { data } = await apiClient.post<ClinicalRecord>('/clinical-records', input, config);
    return data;
  },

  async update(id: number, input: UpdateClinicalRecordInput, config?: AxiosRequestConfig): Promise<ClinicalRecord> {
    const { data } = await apiClient.patch<ClinicalRecord>(`/clinical-records/${id}`, input, config);
    return data;
  },

  async remove(id: number, config?: AxiosRequestConfig): Promise<void> {
    await apiClient.delete(`/clinical-records/${id}`, config);
  },
};
