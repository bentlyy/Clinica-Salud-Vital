-- RBAC granular permissions migration

-- Roles already exist in users table (role: admin, doctor, user)

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255),
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Role permissions (which roles have which permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- User specific permissions (overrides role permissions)
CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  granted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  UNIQUE(user_id, permission_id)
);

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
-- Booking permissions
('booking:read_own', 'Read own bookings', 'booking', 'read:own'),
('booking:read_all', 'Read all bookings', 'booking', 'read:all'),
('booking:create', 'Create bookings', 'booking', 'create'),
('booking:update_own', 'Update own bookings', 'booking', 'update:own'),
('booking:cancel_own', 'Cancel own bookings', 'booking', 'cancel:own'),
-- Clinical record permissions
('clinical_record:read_own', 'Read own clinical records', 'clinical_record', 'read:own'),
('clinical_record:read_patient', 'Read patient clinical records', 'clinical_record', 'read:patient'),
('clinical_record:read_all', 'Read all clinical records', 'clinical_record', 'read:all'),
('clinical_record:create', 'Create clinical records', 'clinical_record', 'create'),
('clinical_record:update_own', 'Update own clinical records', 'clinical_record', 'update:own'),
('clinical_record:delete_own', 'Delete own clinical records', 'clinical_record', 'delete:own'),
-- Prescription permissions
('prescription:read_own', 'Read own prescriptions', 'prescription', 'read:own'),
('prescription:read_patient', 'Read patient prescriptions', 'prescription', 'read:patient'),
('prescription:read_all', 'Read all prescriptions', 'prescription', 'read:all'),
('prescription:create', 'Create prescriptions', 'prescription', 'create'),
-- Billing permissions
('billing:read_own', 'Read own invoices', 'billing', 'read:own'),
('billing:read_patient', 'Read patient invoices', 'billing', 'read:patient'),
('billing:read_all', 'Read all invoices', 'billing', 'read:all'),
('billing:create', 'Create invoices', 'billing', 'create'),
('billing:update', 'Update invoices', 'billing', 'update'),
-- Lab permissions
('lab:read_own', 'Read own lab requests', 'lab', 'read:own'),
('lab:read_patient', 'Read patient lab requests', 'lab', 'read:patient'),
('lab:read_all', 'Read all lab requests', 'lab', 'read:all'),
('lab:create', 'Create lab requests', 'lab', 'create'),
('lab:update', 'Update lab requests', 'lab', 'update'),
-- Audit permissions
('audit:read', 'Read audit logs', 'audit', 'read');

-- Assign permissions to roles
INSERT INTO role_permissions (role, permission_id)
SELECT 'user', id FROM permissions WHERE name IN ('booking:read_own', 'booking:create', 'booking:cancel_own', 'clinical_record:read_own', 'prescription:read_own', 'billing:read_own', 'lab:read_own');

INSERT INTO role_permissions (role, permission_id)
SELECT 'doctor', id FROM permissions WHERE name IN (
  'booking:read_own', 'booking:read_all',
  'clinical_record:read_own', 'clinical_record:read_patient', 'clinical_record:create', 'clinical_record:update_own', 'clinical_record:delete_own',
  'prescription:read_own', 'prescription:read_patient', 'prescription:create',
  'billing:read_own', 'billing:read_all', 'billing:create',
  'lab:read_own', 'lab:read_patient', 'lab:read_all', 'lab:create', 'lab:update'
);

INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);