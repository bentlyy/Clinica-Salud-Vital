export interface BookingsByMonth {
  month: string;
  total: number;
  confirmed: number;
  cancelled: number;
}

export interface BookingsByStatus {
  status: string;
  count: number;
}

export interface TopDoctor {
  id: number;
  name: string;
  specialty: string;
  appointments: number;
  confirmed_bookings: number;
}

export interface DashboardStats {
  total_patients: number;
  total_doctors: number;
  total_bookings: number;
  today_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
}

export interface AdminAnalytics {
  stats: DashboardStats;
  bookings_by_month: BookingsByMonth[];
  bookings_by_status: BookingsByStatus[];
  top_doctors: TopDoctor[];
}

export interface DoctorAnalyticsStats {
  total_bookings: number;
  upcoming_bookings: number;
  patients_served: number;
  clinical_records: number;
}
