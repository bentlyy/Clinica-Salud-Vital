export interface SpecialtyDoctor {
  id: number;
  name: string;
  email: string;
}

export interface Specialty {
  id: number;
  tenant_id: string;
  name: string;
  icon?: string;
  description?: string;
  department?: string;
  procedures?: string[];
  color?: string;
  created_at: string;
  doctors?: SpecialtyDoctor[];
}

export interface CreateSpecialtyInput {
  name: string;
  description?: string;
  icon?: string;
  department?: string;
  color?: string;
  procedures?: string[];
}

export interface UpdateSpecialtyInput {
  name?: string;
  description?: string;
  icon?: string;
  department?: string;
  color?: string;
  procedures?: string[];
}

export interface SpecialtyListParams {
  page?: number;
  limit?: number;
  search?: string;
  tenantId?: string;
}
