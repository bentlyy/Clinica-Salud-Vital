import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type { User, CreateUserInput, UserListParams } from '../types/user.types';

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
    tenant_id: 0,
    is_active: row.active,
    phone: row.phone,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

export const userService = {
  async list(params: UserListParams = {}): Promise<PaginatedResponse<User>> {
    const { data } = await apiClient.get<BackendPaginatedResponse>('/doctors/users', { params });
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

  async toggleActive(id: number): Promise<{ is_active: boolean }> {
    const { data } = await apiClient.patch<{ active: boolean }>(`/doctors/users/${id}/active`);
    return { is_active: data.active };
  },

  async create(input: CreateUserInput): Promise<User> {
    const { data } = await apiClient.post<User>('/auth/register', input);
    return data;
  },
};
