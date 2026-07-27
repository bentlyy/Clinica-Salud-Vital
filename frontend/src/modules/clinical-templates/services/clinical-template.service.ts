import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type {
  ClinicalTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '../types/template.types';

export const clinicalTemplateService = {
  async list(opts?: { signal?: AbortSignal }): Promise<PaginatedResponse<ClinicalTemplate>> {
    const { data } = await apiClient.get<PaginatedResponse<ClinicalTemplate>>('/clinical-templates', { signal: opts?.signal });
    return data;
  },

  async getById(id: number, opts?: { signal?: AbortSignal }): Promise<ClinicalTemplate> {
    const { data } = await apiClient.get<ClinicalTemplate>(`/clinical-templates/${id}`, { signal: opts?.signal });
    return data;
  },

  async create(input: CreateTemplateInput, opts?: { signal?: AbortSignal }): Promise<ClinicalTemplate> {
    const { data } = await apiClient.post<ClinicalTemplate>('/clinical-templates', input, { signal: opts?.signal });
    return data;
  },

  async update(id: number, input: UpdateTemplateInput, opts?: { signal?: AbortSignal }): Promise<ClinicalTemplate> {
    const { data } = await apiClient.patch<ClinicalTemplate>(`/clinical-templates/${id}`, input, { signal: opts?.signal });
    return data;
  },

  async remove(id: number, opts?: { signal?: AbortSignal }): Promise<void> {
    await apiClient.delete(`/clinical-templates/${id}`, { signal: opts?.signal });
  },
};
