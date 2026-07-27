import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type {
  Specialty,
  CreateSpecialtyInput,
  UpdateSpecialtyInput,
  SpecialtyListParams,
} from '../types/specialty.types';

export const specialtyService = {
  async list(params: SpecialtyListParams = {}, opts?: { signal?: AbortSignal }): Promise<PaginatedResponse<Specialty>> {
    const { data } = await apiClient.get<Specialty[] | PaginatedResponse<Specialty>>('/specialties', { signal: opts?.signal });

    let specialties: Specialty[];
    if (Array.isArray(data)) {
      specialties = data;
    } else {
      specialties = data.data ?? [];
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      specialties = specialties.filter(
        (s) => s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q),
      );
    }

    return { data: specialties, total: specialties.length, page: 1, limit: specialties.length, totalPages: 1 };
  },

  async getById(id: number, opts?: { signal?: AbortSignal }): Promise<Specialty> {
    const { data } = await apiClient.get<Specialty>(`/specialties/${id}`, { signal: opts?.signal });
    return data;
  },

  async create(input: CreateSpecialtyInput, opts?: { signal?: AbortSignal }): Promise<Specialty> {
    const { data } = await apiClient.post<Specialty>('/specialties', input, { signal: opts?.signal });
    return data;
  },

  async update(id: number, input: UpdateSpecialtyInput, opts?: { signal?: AbortSignal }): Promise<Specialty> {
    const { data } = await apiClient.put<Specialty>(`/specialties/${id}`, input, { signal: opts?.signal });
    return data;
  },

  async remove(id: number, opts?: { signal?: AbortSignal }): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(`/specialties/${id}`, { signal: opts?.signal });
    return data;
  },
};
