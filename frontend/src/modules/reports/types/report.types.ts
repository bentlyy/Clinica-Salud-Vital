export type ReportType = 'appointments' | 'revenue' | 'patients' | 'laboratory' | 'custom';

export interface ReportConfig {
  type: ReportType;
  date_from: string;
  date_to: string;
  filters?: Record<string, unknown>;
}

export interface Report {
  id: number;
  tenant_id: number;
  type: ReportType;
  status: 'generating' | 'completed' | 'failed';
  config: ReportConfig;
  result_url?: string;
  created_at: string;
}

export interface GenerateReportInput {
  type: ReportType;
  date_from: string;
  date_to: string;
  filters?: Record<string, unknown>;
}

export interface AvailableReportType {
  type: ReportType;
  label: string;
  description: string;
  icon: string;
}
