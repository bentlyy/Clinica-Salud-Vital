import type { AxiosRequestConfig } from 'axios';
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
  async list(params: DoctorListParams = {}, config?: AxiosRequestConfig): Promise<PaginatedResponse<Doctor>> {
    const { data } = await apiClient.get<Doctor[] | PaginatedResponse<Doctor>>('/doctors', config);

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

  async listPublic(config?: AxiosRequestConfig): Promise<Doctor[]> {
    const { data } = await apiClient.get<Doctor[] | { data: Doctor[] }>('/doctors/public', config);
    return Array.isArray(data) ? data : (data.data ?? []);
  },

  async getById(id: number, config?: AxiosRequestConfig): Promise<Doctor> {
    const { data } = await apiClient.get<Doctor>(`/doctors/${id}`, config);
    return data;
  },

  async create(input: CreateDoctorInput, config?: AxiosRequestConfig): Promise<Doctor> {
    const { data } = await apiClient.post<Doctor>('/doctors', input, config);
    return data;
  },

  async update(id: number, input: UpdateDoctorInput, config?: AxiosRequestConfig): Promise<Doctor> {
    const { data } = await apiClient.patch<Doctor>(`/doctors/${id}`, input, config);
    return data;
  },

  async invite(id: number, email: string, config?: AxiosRequestConfig): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>(`/doctors/${id}/invite`, { email }, config);
    return data;
  },

  async getStats(id: number, config?: AxiosRequestConfig): Promise<DoctorStats> {
    const { data } = await apiClient.get<DoctorStats>(`/doctors/${id}/stats`, config);
    return data;
  },

  async getSchedule(id: number, config?: AxiosRequestConfig): Promise<DoctorScheduleSlot[]> {
    const { data } = await apiClient.get<DoctorScheduleSlot[]>(`/doctors/${id}/schedule`, config);
    return data;
  },
};
