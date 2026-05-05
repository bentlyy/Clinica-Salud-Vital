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

END $$;
