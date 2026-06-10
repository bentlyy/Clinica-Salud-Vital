-- Migration: Enforce tenant_id NOT NULL on all tables
-- Ensures no row can be inserted without a tenant_id (defense in depth for RLS)

-- Users
ALTER TABLE IF EXISTS users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS users ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Doctors
ALTER TABLE IF EXISTS doctors ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS doctors ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Bookings
ALTER TABLE IF EXISTS bookings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS bookings ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Availability
ALTER TABLE IF EXISTS doctor_availability ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS doctor_availability ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Exceptions
ALTER TABLE IF EXISTS doctor_exceptions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS doctor_exceptions ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Clinical records
ALTER TABLE IF EXISTS clinical_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS clinical_records ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Prescriptions
ALTER TABLE IF EXISTS prescriptions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS prescriptions ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Lab requests
ALTER TABLE IF EXISTS lab_requests ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS lab_requests ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Lab request items
ALTER TABLE IF EXISTS lab_request_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS lab_request_items ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Invoices
ALTER TABLE IF EXISTS invoices ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS invoices ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Invoice items
ALTER TABLE IF EXISTS invoice_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS invoice_items ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Audit logs
ALTER TABLE IF EXISTS audit_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS audit_logs ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Webhooks
ALTER TABLE IF EXISTS webhooks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS webhooks ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Webhook deliveries
ALTER TABLE IF EXISTS webhook_deliveries ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS webhook_deliveries ALTER COLUMN tenant_id SET DEFAULT 'default';

-- ML prediction history
ALTER TABLE IF EXISTS ml_prediction_history ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS ml_prediction_history ALTER COLUMN tenant_id SET DEFAULT 'default';

-- ML model metrics
ALTER TABLE IF EXISTS ml_model_metrics ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS ml_model_metrics ALTER COLUMN tenant_id SET DEFAULT 'default';

-- ML demand forecast
ALTER TABLE IF EXISTS ml_demand_forecast ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS ml_demand_forecast ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Subscriptions
ALTER TABLE IF EXISTS subscriptions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS subscriptions ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Tenant features
ALTER TABLE IF EXISTS tenant_features ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS tenant_features ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Tenant usage (real table name, not usage_records)
ALTER TABLE IF EXISTS tenant_usage ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS tenant_usage ALTER COLUMN tenant_id SET DEFAULT 'default';

-- User consents (GDPR)
ALTER TABLE IF EXISTS user_consents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS user_consents ALTER COLUMN tenant_id SET DEFAULT 'default';

-- PHI access log (HIPAA)
ALTER TABLE IF EXISTS phi_access_log ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS phi_access_log ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Encryption keys
ALTER TABLE IF EXISTS encryption_keys ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS encryption_keys ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Permissions + RBAC tables
ALTER TABLE IF EXISTS role_permissions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS role_permissions ALTER COLUMN tenant_id SET DEFAULT 'default';

ALTER TABLE IF EXISTS user_permissions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS user_permissions ALTER COLUMN tenant_id SET DEFAULT 'default';

ALTER TABLE IF EXISTS permissions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS permissions ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Notification preferences
ALTER TABLE IF EXISTS notification_preferences ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS notification_preferences ALTER COLUMN tenant_id SET DEFAULT 'default';

-- Refresh tokens
ALTER TABLE IF EXISTS refresh_tokens ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE IF EXISTS refresh_tokens ALTER COLUMN tenant_id SET DEFAULT 'default';
