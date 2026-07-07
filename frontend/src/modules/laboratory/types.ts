export type LabRequestStatus =
  | 'pending' | 'received' | 'verified' | 'assigned'
  | 'processing' | 'qc_review' | 'result_entered'
  | 'validated_tech' | 'validated_doctor' | 'signed'
  | 'delivered' | 'cancelled' | 'rejected' | 'repeated';

export type LabPriority = 'low' | 'normal' | 'urgent' | 'emergency';
export type LabAreaCode = 'HEM' | 'BIO' | 'HOR' | 'INM' | 'MIC' | 'PAR' | 'URO' | 'COA' | 'SER';
export type ResultType = 'numeric' | 'text' | 'select' | 'multiselect' | 'graph' | 'image';
export type QCStatus = 'pending' | 'passed' | 'failed' | 'review';
export type SampleStatus = 'pending' | 'received' | 'verified' | 'assigned' | 'processing' | 'completed' | 'rejected' | 'disposed';
export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface LabArea {
  id: number;
  name: string;
  code: LabAreaCode;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  active: boolean;
}

export interface LabTest {
  id: number;
  name: string;
  description: string | null;
  code: string | null;
  category: string | null;
  unit: string | null;
  reference_min: number | null;
  reference_max: number | null;
  price: number;
  reference_ranges: Record<string, { min: number; max: number }> | null;
  lab_area_id: number | null;
  result_type: ResultType;
  result_options: string[] | null;
  decimals: number;
  unit_alt: string | null;
  conversion_factor: number | null;
  critical_min: number | null;
  critical_max: number | null;
  delta_check_pct: number;
  turnaround_time_min: number | null;
  preparation_instructions: string | null;
  sample_type: string | null;
  container_type: string | null;
  volume_ml: number | null;
  active: boolean;
  area?: LabArea;
}

export interface LabRequest {
  id: number;
  request_number: string;
  patient_id: number;
  doctor_id: number;
  clinical_record_id: number | null;
  priority: LabPriority;
  status: LabRequestStatus;
  notes: string | null;
  lab_type: 'internal' | 'external';
  lab_area_id: number | null;
  requested_at: string;
  collected_at: string | null;
  received_at: string | null;
  received_by: number | null;
  verified_at: string | null;
  verified_by: number | null;
  completed_at: string | null;
  urgency_reason: string | null;
  created_at: string;
  updated_at: string;
  patient_name?: string;
  patient_rut?: string;
  patient_email?: string;
  doctor_name?: string;
  doctor_specialty?: string;
  area?: LabArea;
  items?: LabRequestItem[];
}

export interface LabRequestItem {
  id: number;
  lab_request_id: number;
  lab_test_id: number;
  lab_area_id: number | null;
  priority: LabPriority;
  status: LabRequestStatus;
  result_value: string | null;
  result_notes: string | null;
  notes: string | null;
  results: Record<string, unknown> | null;
  unit: string | null;
  is_critical: boolean;
  is_repeated: boolean;
  delta_check_status: string | null;
  validated_by_tech: number | null;
  validated_at_tech: string | null;
  validated_by_doctor: number | null;
  validated_at_doctor: string | null;
  signed_by: number | null;
  signed_at: string | null;
  delivered_at: string | null;
  delivery_method: string | null;
  completed_at: string | null;
  assigned_tech_id: number | null;
  created_at: string;
  test_name?: string;
  test?: LabTest;
  reference_range?: string;
  area?: LabArea;
}

export interface LabSample {
  id: number;
  lab_request_item_id: number;
  lab_request_id: number;
  sample_type: string;
  sample_code: string | null;
  barcode: string | null;
  qr_code: string | null;
  volume: number | null;
  container_type: string | null;
  collection_time: string | null;
  reception_time: string | null;
  received_by: number | null;
  verification_time: string | null;
  verified_by: number | null;
  assigned_tech_id: number | null;
  assigned_equipment_id: number | null;
  processing_start: string | null;
  processing_end: string | null;
  qc_status: QCStatus;
  qc_notes: string | null;
  rejection_reason: string | null;
  is_repeated: boolean;
  repeated_from_id: number | null;
  storage_location: string | null;
  disposal_date: string | null;
  notes: string | null;
  status: SampleStatus;
  created_at: string;
  updated_at: string;
}

export interface LabDashboardMetrics {
  pending: number;
  received: number;
  in_progress: number;
  pending_validation: number;
  validated: number;
  delivered: number;
  rejected: number;
  repeated: number;
  urgent: number;
  critical_unvalidated: number;
  average_processing_time_min: number;
  samples_processed_today: number;
  productivity_per_hour: number;
  sla_breached: number;
  sla_at_risk: number;
}

export interface LabAreaDashboard {
  area: LabArea;
  metrics: LabDashboardMetrics;
  recent_items: LabRequestItem[];
  queue: LabRequest[];
  critical_results: LabRequestItem[];
}

export interface LabResultHistory {
  id: number;
  lab_request_item_id: number;
  patient_id: number;
  lab_test_id: number;
  result_value: string;
  previous_result_value: string;
  delta_percentage: number;
  delta_check_status: 'normal' | 'warning' | 'critical';
  checked_at: string;
}

export interface LabQCRecord {
  id: number;
  lab_test_id: number;
  lab_area_id: number;
  sample_id: number | null;
  equipment_id: number | null;
  reagent_id: number | null;
  qc_type: 'internal' | 'external' | 'calibration' | 'proficiency';
  control_name: string;
  lot_number: string;
  expiration_date: string | null;
  measured_value: number;
  expected_min: number;
  expected_max: number;
  status: 'passed' | 'failed' | 'warning' | 'review';
  performed_by: number;
  reviewed_by: number | null;
  performed_at: string;
  reviewed_at: string | null;
  notes: string | null;
}

export interface LabEquipment {
  id: number;
  name: string;
  model: string | null;
  serial_number: string | null;
  lab_area_id: number | null;
  connection_type: 'manual' | 'hl7' | 'astm' | 'serial' | 'file';
  ip_address: string | null;
  port: number | null;
  active: boolean;
  status: 'online' | 'offline' | 'maintenance' | 'calibration';
  last_maintenance: string | null;
  next_maintenance: string | null;
  last_calibration: string | null;
  area?: LabArea;
}

export interface LabReagent {
  id: number;
  name: string;
  catalog_number: string | null;
  lot_number: string | null;
  supplier: string | null;
  stock_quantity: number;
  unit: string;
  min_stock: number;
  current_stock: number;
  expiration_date: string | null;
  storage_conditions: string | null;
  received_at: string | null;
  opened_at: string | null;
  opened_by: number | null;
  finished_at: string | null;
  lab_test_id: number | null;
  lab_area_id: number | null;
  active: boolean;
  area?: LabArea;
}

export interface LabNotification {
  id: number;
  type: 'critical_result' | 'qc_failure' | 'equipment_alert' | 'stock_alert' | 'sla_breach' | 'repeated_result';
  title: string;
  message: string;
  severity: NotificationSeverity;
  acknowledged: boolean;
  acknowledged_by: number | null;
  acknowledged_at: string | null;
  lab_request_item_id: number | null;
  lab_request_id: number | null;
  link: string | null;
  created_at: string;
}

export interface LabAnalyticsData {
  daily: { date: string; count: number; completed: number }[];
  weekly: { week: string; count: number; completed: number }[];
  monthly: { month: string; count: number; completed: number }[];
  by_doctor: { doctor_name: string; count: number }[];
  by_area: { area_name: string; count: number; avg_time_min: number }[];
  by_priority: { priority: string; count: number }[];
  top_tests: { test_name: string; count: number }[];
  bottom_tests: { test_name: string; count: number }[];
  avg_processing_time: number;
  repeat_rate: number;
  error_rate: number;
  sla_compliance: number;
  total_revenue: number;
}

export interface LabFilterState {
  status: LabRequestStatus | '';
  areaId: number | '';
  priority: LabPriority | '';
  search: string;
  dateFrom: string;
  dateTo: string;
  doctorId: number | '';
  technicianId: number | '';
  isCritical: boolean;
  isRepeated: boolean;
  onlyUrgent: boolean;
}

export const LAB_STATUS_FLOW: LabRequestStatus[] = [
  'pending', 'received', 'verified', 'assigned',
  'processing', 'qc_review', 'result_entered',
  'validated_tech', 'validated_doctor', 'signed', 'delivered'
];

export const LAB_STATUS_LABELS: Record<LabRequestStatus, string> = {
  pending: 'Pendiente',
  received: 'Recibido',
  verified: 'Verificado',
  assigned: 'Asignado',
  processing: 'En Proceso',
  qc_review: 'Control Calidad',
  result_entered: 'Resultado Ingresado',
  validated_tech: 'Validado Técnico',
  validated_doctor: 'Validado Médico',
  signed: 'Firmado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  rejected: 'Rechazado',
  repeated: 'Repetido',
};

export const LAB_STATUS_COLORS: Record<LabRequestStatus, string> = {
  pending: '#f59e0b',
  received: '#3b82f6',
  verified: '#06b6d4',
  assigned: '#8b5cf6',
  processing: '#f97316',
  qc_review: '#ec4899',
  result_entered: '#14b8a6',
  validated_tech: '#22c55e',
  validated_doctor: '#16a34a',
  signed: '#15803d',
  delivered: '#065f46',
  cancelled: '#6b7280',
  rejected: '#ef4444',
  repeated: '#a855f7',
};

export const LAB_PRIORITY_LABELS: Record<LabPriority, string> = {
  low: 'Baja',
  normal: 'Normal',
  urgent: 'Urgente',
  emergency: 'Emergencia',
};

export const LAB_PRIORITY_COLORS: Record<LabPriority, string> = {
  low: '#6b7280',
  normal: '#22c55e',
  urgent: '#f59e0b',
  emergency: '#ef4444',
};

export const LAB_AREA_OPTIONS = [
  { value: 'HEM', label: 'Hematología', color: '#ef4444' },
  { value: 'BIO', label: 'Bioquímica', color: '#f59e0b' },
  { value: 'HOR', label: 'Hormonas', color: '#8b5cf6' },
  { value: 'INM', label: 'Inmunología', color: '#06b6d4' },
  { value: 'MIC', label: 'Microbiología', color: '#10b981' },
  { value: 'PAR', label: 'Parasitología', color: '#84cc16' },
  { value: 'URO', label: 'Uroanálisis', color: '#3b82f6' },
  { value: 'COA', label: 'Coagulación', color: '#ec4899' },
  { value: 'SER', label: 'Serología', color: '#14b8a6' },
];
