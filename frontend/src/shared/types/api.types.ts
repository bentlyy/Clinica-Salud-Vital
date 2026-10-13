export type UserRole = 'superadmin' | 'admin' | 'doctor' | 'lab_technician' | 'patient' | 'guest' | 'user';

export interface JwtUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  tenant_id: string | number;
  tenant_name: string;
  tenant_slug: string;
  currency?: string;
  country_code?: string;
  token_version: number;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  user: JwtUser;
  requires_2fa?: boolean;
}

/** Cuenta local ligada a la organización del Core (GET /auth/inicio). */
export interface InicioUsuario {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
}

export interface InicioOrganizacion {
  id: string;
  slug: string;
  nombre: string;
}

export interface InicioHerramienta {
  slug: string;
  name: string;
  url: string;
}

/** Respuesta del shell SSO: identidad + organización + herramientas. */
export interface InicioResponse {
  usuario: InicioUsuario;
  organizacion: InicioOrganizacion;
  rol: string;
  herramienta: string;
  herramientas: InicioHerramienta[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  statusCode: number;
  code?: string;
  details?: Record<string, string[]>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
