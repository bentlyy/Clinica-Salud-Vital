-- Migration: Convert all TIMESTAMP columns to TIMESTAMPTZ
-- This ensures timezone-aware timestamps across the entire database

-- Helper: convert column with USING clause
DO $$ BEGIN

-- users
ALTER TABLE users ALTER COLUMN blocked_until TYPE TIMESTAMPTZ USING blocked_until AT TIME ZONE 'UTC';
ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE users ALTER COLUMN last_login_at TYPE TIMESTAMPTZ USING last_login_at AT TIME ZONE 'UTC';
-- last_activity_at is already TIMESTAMPTZ

-- bookings
ALTER TABLE bookings ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- clinical_records
ALTER TABLE clinical_records ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE clinical_records ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- prescriptions
ALTER TABLE prescriptions ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- cie10_catalog
ALTER TABLE cie10_catalog ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- audit_logs
ALTER TABLE audit_logs ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- invoices
ALTER TABLE invoices ALTER COLUMN issued_at TYPE TIMESTAMPTZ USING issued_at AT TIME ZONE 'UTC';
ALTER TABLE invoices ALTER COLUMN paid_at TYPE TIMESTAMPTZ USING paid_at AT TIME ZONE 'UTC';
ALTER TABLE invoices ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE invoices ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- invoice_items
ALTER TABLE invoice_items ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- payments
ALTER TABLE payments ALTER COLUMN paid_at TYPE TIMESTAMPTZ USING paid_at AT TIME ZONE 'UTC';
ALTER TABLE payments ALTER COLUMN payment_date TYPE TIMESTAMPTZ USING payment_date AT TIME ZONE 'UTC';
ALTER TABLE payments ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- insurance_claims
ALTER TABLE insurance_claims ALTER COLUMN submitted_at TYPE TIMESTAMPTZ USING submitted_at AT TIME ZONE 'UTC';
ALTER TABLE insurance_claims ALTER COLUMN resolved_at TYPE TIMESTAMPTZ USING resolved_at AT TIME ZONE 'UTC';
ALTER TABLE insurance_claims ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE insurance_claims ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- lab_tests
ALTER TABLE lab_tests ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE lab_tests ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- lab_requests
ALTER TABLE lab_requests ALTER COLUMN requested_at TYPE TIMESTAMPTZ USING requested_at AT TIME ZONE 'UTC';
ALTER TABLE lab_requests ALTER COLUMN completed_at TYPE TIMESTAMPTZ USING completed_at AT TIME ZONE 'UTC';
ALTER TABLE lab_requests ALTER COLUMN collected_at TYPE TIMESTAMPTZ USING collected_at AT TIME ZONE 'UTC';
ALTER TABLE lab_requests ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE lab_requests ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- lab_request_items
ALTER TABLE lab_request_items ALTER COLUMN completed_at TYPE TIMESTAMPTZ USING completed_at AT TIME ZONE 'UTC';
ALTER TABLE lab_request_items ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- permissions
ALTER TABLE permissions ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- role_permissions
ALTER TABLE role_permissions ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- user_permissions
ALTER TABLE user_permissions ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE user_permissions ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';

-- ml_prediction_history
ALTER TABLE ml_prediction_history ALTER COLUMN prediction_date TYPE TIMESTAMPTZ USING prediction_date AT TIME ZONE 'UTC';

-- ml_model_metrics
ALTER TABLE ml_model_metrics ALTER COLUMN trained_at TYPE TIMESTAMPTZ USING trained_at AT TIME ZONE 'UTC';

-- ml_demand_forecast
ALTER TABLE ml_demand_forecast ALTER COLUMN generated_at TYPE TIMESTAMPTZ USING generated_at AT TIME ZONE 'UTC';

-- refresh_tokens
ALTER TABLE refresh_tokens ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';
ALTER TABLE refresh_tokens ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- webhooks
ALTER TABLE webhooks ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE webhooks ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- webhook_deliveries
ALTER TABLE webhook_deliveries ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- tenants
ALTER TABLE tenants ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE tenants ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- specialties
ALTER TABLE specialties ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- plans
ALTER TABLE plans ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE plans ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- subscriptions
ALTER TABLE subscriptions ALTER COLUMN current_period_start TYPE TIMESTAMPTZ USING current_period_start AT TIME ZONE 'UTC';
ALTER TABLE subscriptions ALTER COLUMN current_period_end TYPE TIMESTAMPTZ USING current_period_end AT TIME ZONE 'UTC';
ALTER TABLE subscriptions ALTER COLUMN trial_end TYPE TIMESTAMPTZ USING trial_end AT TIME ZONE 'UTC';
ALTER TABLE subscriptions ALTER COLUMN canceled_at TYPE TIMESTAMPTZ USING canceled_at AT TIME ZONE 'UTC';
ALTER TABLE subscriptions ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE subscriptions ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- subscription_invoices
ALTER TABLE subscription_invoices ALTER COLUMN period_start TYPE TIMESTAMPTZ USING period_start AT TIME ZONE 'UTC';
ALTER TABLE subscription_invoices ALTER COLUMN period_end TYPE TIMESTAMPTZ USING period_end AT TIME ZONE 'UTC';
ALTER TABLE subscription_invoices ALTER COLUMN paid_at TYPE TIMESTAMPTZ USING paid_at AT TIME ZONE 'UTC';
ALTER TABLE subscription_invoices ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- tenant_features
ALTER TABLE tenant_features ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- tenant_usage
ALTER TABLE tenant_usage ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

END $$;
