-- 012: Booking status history table (audit trail for professional tracking)
CREATE TABLE IF NOT EXISTS booking_status_history (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'system',
  changed_by_user_id INT,
  changed_by_role TEXT,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bsh_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_bsh_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bsh_booking_created ON booking_status_history(booking_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bsh_to_status ON booking_status_history(to_status, created_at);
