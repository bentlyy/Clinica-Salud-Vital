export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: string;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}

export interface Session {
  id: number;
  tenant_id: string;
  user_id: number;
  device: string | null;
  ip_address: string | null;
  created_at: string;
  last_activity: string | null;
  revoked_at: string | null;
}
