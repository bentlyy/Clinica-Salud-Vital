-- Additional indexes for performance optimization

-- Users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Doctors table
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);

-- Bookings table - additional indexes
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status_confirmed ON bookings(status, confirmed);

-- Doctor availability
CREATE INDEX IF NOT EXISTS idx_availability_day ON doctor_availability(day_of_week);