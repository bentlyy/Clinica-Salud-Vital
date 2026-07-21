export interface AvailabilityRule {
  id: number;
  doctor_id: number;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  created_at: string;
}

export interface CreateAvailabilityRuleInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const;

export const DAY_NAMES_SHORT = [
  'Dom',
  'Lun',
  'Mar',
  'Mié',
  'Jue',
  'Vie',
  'Sáb',
] as const;

// 1 = Monday through 7 = Sunday for display
export const WEEK_DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
