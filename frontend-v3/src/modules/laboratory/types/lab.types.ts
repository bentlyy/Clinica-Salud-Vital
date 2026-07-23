import type { PaginatedResponse } from '@/shared/types/api.types';

export type LabRequestStatus = 'pending' | 'collected' | 'in_progress' | 'completed' | 'cancelled';

export type LabPriority = 'routine' | 'urgent' | 'emergency';

export interface LabRequest {
  id: number;
  tenant_id: string;
  request_number: string;
  patient_id: number;
  doctor_id: number;
  clinical_record_id?: number;
  status: LabRequestStatus;
  priority: LabPriority;
  notes?: string;
  items?: LabRequestItem[];
  doctor_name?: string;
  doctor_specialty?: string;
  patient_name?: string;
  requested_at?: string;
  collected_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LabRequestItem {
  id: number;
  lab_test_id: number;
  test_name: string;
  status: string;
  result_value?: string;
  result_notes?: string;
  reference_ranges?: any;
  unit?: string;
}

export interface LabResult {
  id: number;
  lab_request_id: number;
  test_name: string;
  value: string;
  unit?: string;
  reference_range?: string;
  is_normal: boolean;
  notes?: string;
}

export interface LabEquipment {
  id: number;
  tenant_id: number;
  name: string;
  type: string;
  model?: string;
  serial_number?: string;
  status: 'operational' | 'maintenance' | 'out_of_service';
  last_calibration?: string;
  next_calibration?: string;
}

export interface LabMetrics {
  pending_requests: number;
  in_progress: number;
  completed_today: number;
  validated_today: number;
  avg_turnaround_hours: number;
}

export interface LabTemplate {
  id: number;
  tenant_id: number;
  name: string;
  tests: string[];
}

export interface CreateLabRequestInput {
  patient_id: number;
  clinical_record_id?: number;
  priority?: LabPriority;
  notes?: string;
  test_ids: number[];
}

export interface UpdateLabRequestInput {
  title?: string;
  description?: string;
  status?: LabRequestStatus;
  priority?: LabPriority;
}

export interface AddLabResultsInput {
  results: {
    test_name: string;
    value: string;
    unit?: string;
    reference_range?: string;
    is_normal: boolean;
    notes?: string;
  }[];
}

export interface CreateLabEquipmentInput {
  name: string;
  type: string;
  model?: string;
  serial_number?: string;
}

export interface UpdateLabEquipmentInput {
  name?: string;
  type?: string;
  model?: string;
  serial_number?: string;
  status?: LabEquipment['status'];
}

export interface CreateLabTemplateInput {
  name: string;
  tests: string[];
}

export interface LabRequestListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: LabRequestStatus;
  priority?: LabPriority;
}

export type { PaginatedResponse };

export const LAB_STATUS_CONFIG: Record<
  LabRequestStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: 'Pendiente', color: '#d97706', bgColor: '#fffbeb' },
  collected: { label: 'Recolectado', color: '#2563eb', bgColor: '#eff6ff' },
  in_progress: { label: 'En Progreso', color: '#7c3aed', bgColor: '#f5f3ff' },
  completed: { label: 'Completado', color: '#0d9488', bgColor: '#f0fdfa' },
  cancelled: { label: 'Cancelado', color: '#6b7280', bgColor: '#f9fafb' },
};

export const LAB_STATUS_OPTIONS: { value: LabRequestStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'collected', label: 'Recolectados' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'completed', label: 'Completados' },
  { value: 'cancelled', label: 'Cancelados' },
];

export const LAB_PRIORITY_CONFIG: Record<
  LabPriority,
  { label: string; color: string; bgColor: string }
> = {
  routine: { label: 'Rutina', color: '#6b7280', bgColor: '#f9fafb' },
  urgent: { label: 'Urgente', color: '#d97706', bgColor: '#fffbeb' },
  emergency: { label: 'Emergencia', color: '#ef4444', bgColor: '#fef2f2' },
};

export const LAB_PRIORITY_OPTIONS: { value: LabPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'routine', label: 'Rutina' },
  { value: 'urgent', label: 'Urgente' },
  { value: 'emergency', label: 'Emergencia' },
];

export const LAB_EQUIPMENT_STATUS_CONFIG: Record<
  LabEquipment['status'],
  { label: string; color: string; bgColor: string }
> = {
  operational: { label: 'Operativo', color: '#059669', bgColor: '#ecfdf5' },
  maintenance: { label: 'Mantenimiento', color: '#d97706', bgColor: '#fffbeb' },
  out_of_service: { label: 'Fuera de Servicio', color: '#ef4444', bgColor: '#fef2f2' },
};
