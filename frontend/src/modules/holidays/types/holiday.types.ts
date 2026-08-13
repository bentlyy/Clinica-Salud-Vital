export interface Holiday {
  id: number;
  tenant_id: string;
  holiday_date: string;
  name: string;
  notice_days: number;
  cancel_bookings: boolean;
  created_by: number | null;
  created_at: string;
}

export interface CreateHolidayInput {
  holiday_date: string;
  name: string;
  notice_days?: number;
  cancel_bookings?: boolean;
}
