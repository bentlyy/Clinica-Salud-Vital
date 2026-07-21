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
