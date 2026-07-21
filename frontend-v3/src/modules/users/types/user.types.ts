import type { UserRole as SharedUserRole } from '@/shared/types/api.types';

export type UserRole = SharedUserRole;

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  tenant_id: number;
  is_active: boolean;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  phone?: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  is_active?: boolean;
}
