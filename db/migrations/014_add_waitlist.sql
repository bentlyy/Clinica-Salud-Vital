-- 014: Waitlist (patients waiting for a freed slot)
CREATE TABLE IF NOT EXISTS waitlist (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  doctor_id INT NOT NULL,
  user_id INT NOT NULL,
  requested_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'booked', 'removed')),
  notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_wl_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_wl_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_waitlist_entry UNIQUE (doctor_id, user_id, requested_date)
);

CREATE INDEX IF NOT EXISTS idx_wl_doctor_date ON waitlist(doctor_id, requested_date, status);
CREATE INDEX IF NOT EXISTS idx_wl_user ON waitlist(user_id, status);
CREATE INDEX IF NOT EXISTS idx_wl_tenant ON waitlist(tenant_id);
