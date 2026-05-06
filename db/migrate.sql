-- Migration: add RUT validation, guest bookings, confirmation & no-show penalty
-- Run: psql -U postgres -d clinic -f migrate.sql

DO $$ BEGIN

ALTER TABLE users ADD COLUMN IF NOT EXISTS rut TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS no_show_count INT DEFAULT 0;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_token TEXT UNIQUE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_rut TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

ALTER TABLE bookings
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE bookings
  ADD CONSTRAINT check_guest_or_user
  CHECK (user_id IS NOT NULL OR (guest_rut IS NOT NULL AND guest_email IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_bookings_guest_rut ON bookings(guest_rut);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation_token ON bookings(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmed ON bookings(confirmed);

CREATE INDEX IF NOT EXISTS idx_users_rut ON users(rut);

-- ML Prediction History Tables
CREATE TABLE IF NOT EXISTS ml_prediction_history (
  id SERIAL PRIMARY KEY,
  model_type TEXT NOT NULL,
  input_data JSONB NOT NULL,
  prediction_result JSONB NOT NULL,
  confidence TEXT,
  prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  doctor_id INT,
  user_id INT,
  booking_id INT,
  actual_result BOOLEAN,
  is_correct BOOLEAN,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS ml_model_metrics (
  id SERIAL PRIMARY KEY,
  model_type TEXT NOT NULL,
  trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_ms INT,
  samples_used INT,
  accuracy FLOAT,
  loss_value FLOAT,
  status TEXT DEFAULT 'success',
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS ml_demand_forecast (
  id SERIAL PRIMARY KEY,
  forecast_date DATE NOT NULL,
  predicted_demand INT NOT NULL,
  actual_demand INT,
  confidence TEXT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  model_version TEXT DEFAULT 'v1'
);

CREATE INDEX IF NOT EXISTS idx_prediction_history_model ON ml_prediction_history(model_type);
CREATE INDEX IF NOT EXISTS idx_prediction_history_date ON ml_prediction_history(prediction_date);
CREATE INDEX IF NOT EXISTS idx_prediction_history_user ON ml_prediction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_demand_forecast_date ON ml_demand_forecast(forecast_date);

END $$;
