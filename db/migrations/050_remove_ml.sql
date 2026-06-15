-- 050: Eliminar módulo ML (tablas, índices, funciones)
DROP TABLE IF EXISTS ml_run_artifacts CASCADE;
DROP TABLE IF EXISTS ml_run_metrics CASCADE;
DROP TABLE IF EXISTS ml_run_params CASCADE;
DROP TABLE IF EXISTS ml_runs CASCADE;
DROP TABLE IF EXISTS ml_experiments CASCADE;
DROP TABLE IF EXISTS ml_demand_forecast CASCADE;
DROP TABLE IF EXISTS ml_model_metrics CASCADE;
DROP TABLE IF EXISTS ml_prediction_history CASCADE;

DROP INDEX IF EXISTS idx_ml_predictions_tenant_model;
DROP INDEX IF EXISTS idx_ml_experiments_tenant;
DROP INDEX IF EXISTS idx_ml_runs_experiment;
DROP INDEX IF EXISTS idx_ml_runs_tenant;
DROP INDEX IF EXISTS idx_ml_runs_model_type;
DROP INDEX IF EXISTS idx_ml_run_params_run;
DROP INDEX IF EXISTS idx_ml_run_params_tenant;
DROP INDEX IF EXISTS idx_ml_run_metrics_run;
DROP INDEX IF EXISTS idx_ml_run_metrics_tenant;
DROP INDEX IF EXISTS idx_ml_run_artifacts_run;
DROP INDEX IF EXISTS idx_ml_run_artifacts_tenant;
