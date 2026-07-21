export interface Specialty {
  id: number;
  tenant_id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface CreateSpecialtyInput {
  name: string;
  description?: string;
}

export interface UpdateSpecialtyInput {
  name?: string;
  description?: string;
}

export interface SpecialtyListParams {
  page?: number;
  limit?: number;
  search?: string;
}
