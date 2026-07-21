import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type {
  Specialty,
  CreateSpecialtyInput,
  UpdateSpecialtyInput,
  SpecialtyListParams,
} from '../types/specialty.types';

export const specialtyService = {
  async list(params: SpecialtyListParams = {}): Promise<PaginatedResponse<Specialty>> {
    const { data } = await apiClient.get<Specialty[] | PaginatedResponse<Specialty>>('/specialties');

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

  async getById(id: number): Promise<Specialty> {
    const { data } = await apiClient.get<Specialty>(`/specialties/${id}`);
    return data;
  },

  async create(input: CreateSpecialtyInput): Promise<Specialty> {
    const { data } = await apiClient.post<Specialty>('/specialties', input);
    return data;
  },

  async update(id: number, input: UpdateSpecialtyInput): Promise<Specialty> {
    const { data } = await apiClient.put<Specialty>(`/specialties/${id}`, input);
    return data;
  },

  async remove(id: number): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(`/specialties/${id}`);
    return data;
  },
};
