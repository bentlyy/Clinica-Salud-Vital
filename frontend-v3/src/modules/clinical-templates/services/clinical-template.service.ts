import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type {
  ClinicalTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '../types/template.types';

export const clinicalTemplateService = {
  async list(): Promise<PaginatedResponse<ClinicalTemplate>> {
    const { data } = await apiClient.get<PaginatedResponse<ClinicalTemplate>>('/clinical-templates');
    return data;
  },

  async getById(id: number): Promise<ClinicalTemplate> {
    const { data } = await apiClient.get<ClinicalTemplate>(`/clinical-templates/${id}`);
    return data;
  },

  async create(input: CreateTemplateInput): Promise<ClinicalTemplate> {
    const { data } = await apiClient.post<ClinicalTemplate>('/clinical-templates', input);
    return data;
  },

  async update(id: number, input: UpdateTemplateInput): Promise<ClinicalTemplate> {
    const { data } = await apiClient.patch<ClinicalTemplate>(`/clinical-templates/${id}`, input);
    return data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/clinical-templates/${id}`);
  },
};
