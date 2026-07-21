import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type {
  Doctor,
  CreateDoctorInput,
  UpdateDoctorInput,
  DoctorListParams,
  DoctorStats,
  DoctorScheduleSlot,
} from '../types/doctor.types';

export const doctorService = {
  async list(params: DoctorListParams = {}): Promise<PaginatedResponse<Doctor>> {
    const { data } = await apiClient.get<Doctor[] | PaginatedResponse<Doctor>>('/doctors');

    let doctors: Doctor[];
    if (Array.isArray(data)) {
      doctors = data;
    } else {
      doctors = data.data ?? [];
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      doctors = doctors.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.specialty?.toLowerCase().includes(q) ||
          d.email?.toLowerCase().includes(q),
      );
    }

    return { data: doctors, total: doctors.length, page: 1, limit: doctors.length, totalPages: 1 };
  },

  async getById(id: number): Promise<Doctor> {
    const { data } = await apiClient.get<Doctor>(`/doctors/${id}`);
    return data;
  },

  async create(input: CreateDoctorInput): Promise<Doctor> {
    const { data } = await apiClient.post<Doctor>('/doctors', input);
    return data;
  },

  async update(id: number, input: UpdateDoctorInput): Promise<Doctor> {
    const { data } = await apiClient.patch<Doctor>(`/doctors/${id}`, input);
    return data;
  },

  async invite(id: number, email: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>(`/doctors/${id}/invite`, { email });
    return data;
  },

  async getStats(id: number): Promise<DoctorStats> {
    const { data } = await apiClient.get<DoctorStats>(`/doctors/${id}/stats`);
    return data;
  },

  async getSchedule(id: number): Promise<DoctorScheduleSlot[]> {
    const { data } = await apiClient.get<DoctorScheduleSlot[]>(`/doctors/${id}/schedule`);
    return data;
  },
};
