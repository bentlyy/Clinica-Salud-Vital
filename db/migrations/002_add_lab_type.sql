-- Add lab_type to lab_requests (internal / external)
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS lab_type VARCHAR(10)
  CHECK (lab_type IN ('internal', 'external'));

-- Add lab_technician role to users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('superadmin', 'admin', 'doctor', 'lab_technician', 'patient', 'guest', 'user'));
