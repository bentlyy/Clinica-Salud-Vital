-- 052: Add tenant_id composite indexes for tables missing them

CREATE INDEX IF NOT EXISTS idx_doctor_availability_tenant_id ON doctor_availability(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doctor_exceptions_tenant_id ON doctor_exceptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant_id ON invoice_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_tenant_id ON lab_tests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_request_items_tenant_id ON lab_request_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_permissions_tenant_id ON permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant_id ON role_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_tenant_id ON user_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ml_model_metrics_tenant_id ON ml_model_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ml_demand_forecast_tenant_id ON ml_demand_forecast(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant_id ON webhook_deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_tenant_id ON user_consents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_retention_policy_tenant_id ON data_retention_policy(tenant_id);
CREATE INDEX IF NOT EXISTS idx_slow_query_log_tenant_id ON slow_query_log(tenant_id);

INSERT INTO _migrations (name, applied_at) VALUES ('052_add_tenant_composite_indexes', NOW())
ON CONFLICT (name) DO NOTHING;
