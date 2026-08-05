import type { UserRole as SharedUserRole } from '@/shared/types/api.types';

export type UserRole = SharedUserRole;

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  rut?: string;
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
  rut?: string;
  specialty?: string;
}

export interface InviteUserInput {
  email: string;
  name?: string;
  role: 'patient' | 'doctor' | 'lab_technician';
  specialty?: string;
}

export interface CreateDoctorInput {
  name: string;
  specialty: string;
  email: string;
  rut?: string;
  phone?: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  is_active?: boolean;
}
