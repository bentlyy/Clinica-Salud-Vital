-- Migration: Add FOREIGN KEY constraints for all tenant_id columns
-- Only the 4 SaaS tables (subscriptions, subscription_invoices, tenant_features, tenant_usage) already have FKs.
-- All other entity tables with tenant_id need them now.
-- Using NOT VALID + VALIDATE to avoid long table locks.

-- users: nullable (superadmin has no tenant)
ALTER TABLE users ADD CONSTRAINT fk_users_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE users VALIDATE CONSTRAINT fk_users_tenant;

-- doctors
ALTER TABLE doctors ADD CONSTRAINT fk_doctors_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE doctors VALIDATE CONSTRAINT fk_doctors_tenant;

-- bookings
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE bookings VALIDATE CONSTRAINT fk_bookings_tenant;

-- doctor_availability
ALTER TABLE doctor_availability ADD CONSTRAINT fk_doctor_availability_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE doctor_availability VALIDATE CONSTRAINT fk_doctor_availability_tenant;

-- doctor_exceptions
ALTER TABLE doctor_exceptions ADD CONSTRAINT fk_doctor_exceptions_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE doctor_exceptions VALIDATE CONSTRAINT fk_doctor_exceptions_tenant;

-- clinical_records
ALTER TABLE clinical_records ADD CONSTRAINT fk_clinical_records_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE clinical_records VALIDATE CONSTRAINT fk_clinical_records_tenant;

-- prescriptions
ALTER TABLE prescriptions ADD CONSTRAINT fk_prescriptions_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE prescriptions VALIDATE CONSTRAINT fk_prescriptions_tenant;

-- audit_logs
ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE audit_logs VALIDATE CONSTRAINT fk_audit_logs_tenant;

-- invoices
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE invoices VALIDATE CONSTRAINT fk_invoices_tenant;

-- invoice_items
ALTER TABLE invoice_items ADD CONSTRAINT fk_invoice_items_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE invoice_items VALIDATE CONSTRAINT fk_invoice_items_tenant;

-- payments
ALTER TABLE payments ADD CONSTRAINT fk_payments_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE payments VALIDATE CONSTRAINT fk_payments_tenant;

-- insurance_claims
ALTER TABLE insurance_claims ADD CONSTRAINT fk_insurance_claims_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE insurance_claims VALIDATE CONSTRAINT fk_insurance_claims_tenant;

-- lab_tests
ALTER TABLE lab_tests ADD CONSTRAINT fk_lab_tests_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE lab_tests VALIDATE CONSTRAINT fk_lab_tests_tenant;

-- lab_requests
ALTER TABLE lab_requests ADD CONSTRAINT fk_lab_requests_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE lab_requests VALIDATE CONSTRAINT fk_lab_requests_tenant;

-- lab_request_items
ALTER TABLE lab_request_items ADD CONSTRAINT fk_lab_request_items_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE lab_request_items VALIDATE CONSTRAINT fk_lab_request_items_tenant;

-- permissions
ALTER TABLE permissions ADD CONSTRAINT fk_permissions_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE permissions VALIDATE CONSTRAINT fk_permissions_tenant;

-- role_permissions
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE role_permissions VALIDATE CONSTRAINT fk_role_permissions_tenant;

-- user_permissions
ALTER TABLE user_permissions ADD CONSTRAINT fk_user_permissions_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE user_permissions VALIDATE CONSTRAINT fk_user_permissions_tenant;

-- ml_prediction_history
ALTER TABLE ml_prediction_history ADD CONSTRAINT fk_ml_prediction_history_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE ml_prediction_history VALIDATE CONSTRAINT fk_ml_prediction_history_tenant;

-- ml_model_metrics
ALTER TABLE ml_model_metrics ADD CONSTRAINT fk_ml_model_metrics_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE ml_model_metrics VALIDATE CONSTRAINT fk_ml_model_metrics_tenant;

-- ml_demand_forecast
ALTER TABLE ml_demand_forecast ADD CONSTRAINT fk_ml_demand_forecast_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE ml_demand_forecast VALIDATE CONSTRAINT fk_ml_demand_forecast_tenant;

-- refresh_tokens
ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_tokens_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE refresh_tokens VALIDATE CONSTRAINT fk_refresh_tokens_tenant;

-- webhooks
ALTER TABLE webhooks ADD CONSTRAINT fk_webhooks_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE webhooks VALIDATE CONSTRAINT fk_webhooks_tenant;

-- webhook_deliveries
ALTER TABLE webhook_deliveries ADD CONSTRAINT fk_webhook_deliveries_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE webhook_deliveries VALIDATE CONSTRAINT fk_webhook_deliveries_tenant;

-- notification_preferences
ALTER TABLE notification_preferences ADD CONSTRAINT fk_notification_preferences_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE notification_preferences VALIDATE CONSTRAINT fk_notification_preferences_tenant;

-- specialties
ALTER TABLE specialties ADD CONSTRAINT fk_specialties_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE specialties VALIDATE CONSTRAINT fk_specialties_tenant;
