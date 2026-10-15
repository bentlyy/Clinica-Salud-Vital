-- ============================================================
-- CI seed — two tenants with data in RLS-protected tables
-- ============================================================
-- Run as a superuser (bypasses RLS) AFTER db/ci-rls-bootstrap.sql.
-- Gives the isolation test real rows to check: with a broken policy,
-- `ci-alpha` would see `ci-beta` rows (and vice versa) and the test fails.

BEGIN;

DELETE FROM clinical_records   WHERE tenant_id IN ('ci-alpha', 'ci-beta');
DELETE FROM bookings           WHERE tenant_id IN ('ci-alpha', 'ci-beta');
DELETE FROM doctor_availability WHERE tenant_id IN ('ci-alpha', 'ci-beta');
DELETE FROM doctors            WHERE tenant_id IN ('ci-alpha', 'ci-beta');
DELETE FROM users              WHERE tenant_id IN ('ci-alpha', 'ci-beta');
DELETE FROM tenants            WHERE id IN ('ci-alpha', 'ci-beta');

INSERT INTO tenants (id, name, domain) VALUES
  ('ci-alpha', 'CI Alpha', 'ci-alpha.local'),
  ('ci-beta',  'CI Beta',  'ci-beta.local');

INSERT INTO users (email, password, name, role, tenant_id) VALUES
  ('admin@ci-alpha.local',   '$2b$10$CIplaceholderHashTestsOnly000000000000000000000000', 'Alpha Admin',  'admin',  'ci-alpha'),
  ('doctor@ci-alpha.local',  '$2b$10$CIplaceholderHashTestsOnly000000000000000000000000', 'Alpha Doctor', 'doctor', 'ci-alpha'),
  ('patient@ci-alpha.local', '$2b$10$CIplaceholderHashTestsOnly000000000000000000000000', 'Alpha Patient','patient','ci-alpha'),
  ('admin@ci-beta.local',    '$2b$10$CIplaceholderHashTestsOnly000000000000000000000000', 'Beta Admin',   'admin',  'ci-beta'),
  ('doctor@ci-beta.local',   '$2b$10$CIplaceholderHashTestsOnly000000000000000000000000', 'Beta Doctor',  'doctor', 'ci-beta'),
  ('patient@ci-beta.local',  '$2b$10$CIplaceholderHashTestsOnly000000000000000000000000', 'Beta Patient', 'patient','ci-beta');

INSERT INTO doctors (name, specialty, email, tenant_id) VALUES
  ('Alpha Doctor', 'Medicina General', 'doctor@ci-alpha.local', 'ci-alpha'),
  ('Beta Doctor',  'Medicina General', 'doctor@ci-beta.local',  'ci-beta');

INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, tenant_id)
SELECT id, 1, '09:00', '13:00', tenant_id FROM doctors WHERE tenant_id IN ('ci-alpha', 'ci-beta');

INSERT INTO bookings (doctor_id, date, time, status, guest_rut, guest_email, tenant_id)
SELECT id, CURRENT_DATE, '09:00', 'confirmed', '11.111.111-1', 'guest@' || tenant_id || '.local', tenant_id
FROM doctors WHERE tenant_id IN ('ci-alpha', 'ci-beta');

INSERT INTO clinical_records (doctor_id, booking_id, chief_complaint, tenant_id)
SELECT d.id, b.id, 'CI isolation seed', d.tenant_id
FROM doctors d
JOIN bookings b ON b.doctor_id = d.id
WHERE d.tenant_id IN ('ci-alpha', 'ci-beta');

COMMIT;
