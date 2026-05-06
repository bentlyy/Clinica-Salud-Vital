import type { UserRole } from './index';

export interface AuthRequest {
  user?: {
    id: number;
    email: string;
    role: UserRole;
    rut?: string;
  };
}