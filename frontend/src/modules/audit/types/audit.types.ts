export interface AuditLog {
  id: number;
  tenant_id: number;
  user_id: number;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface AuditStats {
  total_actions_today: number;
  actions_by_type: Record<string, number>;
  most_active_users: { user_name: string; count: number }[];
}

export interface AuditListParams {
  page?: number;
  limit?: number;
  user_id?: number;
  action?: string;
  entity_type?: string;
  date_from?: string;
  date_to?: string;
  tenant_id?: string;
}

export interface AuditRecentActivity {
  id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  created_at: string;
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  create: 'Creación',
  update: 'Actualización',
  delete: 'Eliminación',
  login: 'Inicio de Sesión',
  logout: 'Cierre de Sesión',
  view: 'Consulta',
  export: 'Exportación',
  validate: 'Validación',
  approve: 'Aprobación',
  reject: 'Rechazo',
  assign: 'Asignación',
  cancel: 'Cancelación',
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  user: 'Usuario',
  doctor: 'Doctor',
  patient: 'Paciente',
  booking: 'Cita',
  lab_request: 'Solicitud Lab',
  lab_result: 'Resultado Lab',
  clinical_record: 'Expediente',
  prescription: 'Receta',
  equipment: 'Equipamiento',
  template: 'Plantilla',
  tenant: 'Clínica',
  billing: 'Facturación',
};

export const AUDIT_ACTION_OPTIONS: { value: string | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'create', label: 'Creación' },
  { value: 'update', label: 'Actualización' },
  { value: 'delete', label: 'Eliminación' },
  { value: 'login', label: 'Inicio de Sesión' },
  { value: 'logout', label: 'Cierre de Sesión' },
  { value: 'view', label: 'Consulta' },
  { value: 'export', label: 'Exportación' },
  { value: 'validate', label: 'Validación' },
];

export const AUDIT_ENTITY_OPTIONS: { value: string | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'user', label: 'Usuario' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'patient', label: 'Paciente' },
  { value: 'booking', label: 'Cita' },
  { value: 'lab_request', label: 'Solicitud Lab' },
  { value: 'lab_result', label: 'Resultado Lab' },
  { value: 'clinical_record', label: 'Expediente' },
  { value: 'prescription', label: 'Receta' },
  { value: 'equipment', label: 'Equipamiento' },
];
