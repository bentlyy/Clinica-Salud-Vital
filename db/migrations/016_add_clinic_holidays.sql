-- 016: Clinic holidays / closure days (admin-defined, block bookings + mass cancel)
CREATE TABLE IF NOT EXISTS clinic_holidays (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  notice_days INT NOT NULL DEFAULT 15,
  cancel_bookings BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_holiday_tenant_date UNIQUE (tenant_id, holiday_date),
  CONSTRAINT fk_holiday_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_holiday_tenant_date ON clinic_holidays(tenant_id, holiday_date);
