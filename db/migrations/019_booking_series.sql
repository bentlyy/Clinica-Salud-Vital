-- 019: Recurring booking series (F4)
CREATE TABLE IF NOT EXISTS booking_series (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  doctor_id INT NOT NULL,
  user_id INT NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  interval_count INT NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  time TIME NOT NULL,
  duration INT NOT NULL DEFAULT 30,
  occurrences INT NOT NULL,
  created_count INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  CONSTRAINT fk_series_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_series_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_booking_series_tenant_doctor ON booking_series(tenant_id, doctor_id);
CREATE INDEX IF NOT EXISTS idx_booking_series_user ON booking_series(tenant_id, user_id);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS series_id INT;
CREATE INDEX IF NOT EXISTS idx_bookings_series ON bookings(series_id);
