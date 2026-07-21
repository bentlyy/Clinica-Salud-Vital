export interface BookingsByMonth {
  month: string;
  total: number;
  confirmed: number;
  cancelled: number;
  completed: number;
}

export interface RevenueByMonth {
  month: string;
  revenue: number;
  expenses: number;
}

export interface BookingsByStatus {
  status: string;
  count: number;
}

export interface TopDoctor {
  name: string;
  appointments: number;
  revenue: number;
}

export interface RecentActivity {
  action: string;
  user: string;
  date: string;
}

export interface AdminAnalytics {
  bookings_by_month: BookingsByMonth[];
  revenue_by_month: RevenueByMonth[];
  bookings_by_status: BookingsByStatus[];
  top_doctors: TopDoctor[];
  recent_activity: RecentActivity[];
}

export interface DoctorAnalyticsStats {
  total_patients: number;
  total_appointments: number;
  today_appointments: number;
  completed_appointments: number;
  monthly_revenue: number;
  appointments_by_status: BookingsByStatus[];
  patients_by_month: { month: string; count: number }[];
}
