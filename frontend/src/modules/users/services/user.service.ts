import type { AxiosRequestConfig } from 'axios';
import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type { User, CreateDoctorInput, InviteUserInput, UserListParams } from '../types/user.types';

interface BackendUserRow {
  id: number;
  email: string;
  name: string;
  role: string;
  rut?: string;
  phone?: string;
  active: boolean;
  created_at: string;
}

interface BackendPaginatedResponse {
  data: BackendUserRow[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function mapUser(row: BackendUserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as User['role'],
    is_active: row.active,
    rut: row.rut,
    phone: row.phone,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

export const userService = {
  async list(params: UserListParams = {}, config?: AxiosRequestConfig): Promise<PaginatedResponse<User>> {
    const { data } = await apiClient.get<BackendPaginatedResponse>('/doctors/users', { params, ...config });
    const users = (data.data ?? []).map(mapUser);
    const pagination = data.pagination;
    return {
      data: users,
      total: pagination?.total ?? users.length,
      page: pagination?.page ?? 1,
      limit: pagination?.limit ?? users.length,
      totalPages: pagination?.totalPages ?? 1,
    };
  },

  async toggleActive(id: number, config?: AxiosRequestConfig): Promise<{ is_active: boolean }> {
    const { data } = await apiClient.patch<{ active: boolean }>(`/doctors/users/${id}/active`, undefined, config);
    return { is_active: data.active };
  },

  async registerDoctor(input: CreateDoctorInput, config?: AxiosRequestConfig): Promise<User> {
    const { data } = await apiClient.post<{ doctor: { id: number; user_id: number; name: string } }>(
      '/doctors/register',
      input,
      config,
    );
    return {
      id: data.doctor.user_id,
      name: data.doctor.name,
      email: input.email,
      role: 'doctor',
      is_active: true,
      rut: input.rut,
      phone: input.phone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  async invitePerson(input: InviteUserInput, config?: AxiosRequestConfig): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/doctors/invite', input, config);
    return data;
  },
};
