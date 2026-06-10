-- 048: Add GIN indexes for JSONB columns to support efficient queries

CREATE INDEX IF NOT EXISTS idx_payments_metadata_gin ON payments USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_tenants_config_gin ON tenants USING gin(config);
CREATE INDEX IF NOT EXISTS idx_subscriptions_metadata_gin ON subscriptions USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_clinical_records_vitals_gin ON clinical_records USING gin(vital_signs);
CREATE INDEX IF NOT EXISTS idx_ml_prediction_input_gin ON ml_prediction_history USING gin(input_data);
CREATE INDEX IF NOT EXISTS idx_ml_prediction_result_gin ON ml_prediction_history USING gin(prediction_result);
