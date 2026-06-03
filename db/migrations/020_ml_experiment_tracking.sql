-- Migration: ML Experiment Tracking Tables
-- Tracks model training runs, hyperparameters, metrics, and artifacts

CREATE TABLE IF NOT EXISTS ml_experiments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_experiments_tenant ON ml_experiments(tenant_id);

CREATE TABLE IF NOT EXISTS ml_runs (
  id SERIAL PRIMARY KEY,
  experiment_id INTEGER REFERENCES ml_experiments(id) ON DELETE CASCADE,
  run_name VARCHAR(255),
  model_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'running',
  tenant_id TEXT NOT NULL DEFAULT 'default',
  source_version VARCHAR(100),
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_runs_experiment ON ml_runs(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ml_runs_tenant ON ml_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ml_runs_model_type ON ml_runs(model_type);

CREATE TABLE IF NOT EXISTS ml_run_params (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES ml_runs(id) ON DELETE CASCADE,
  param_key VARCHAR(255) NOT NULL,
  param_value TEXT NOT NULL,
  param_type VARCHAR(50) DEFAULT 'string',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_run_params_run ON ml_run_params(run_id);

CREATE TABLE IF NOT EXISTS ml_run_metrics (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES ml_runs(id) ON DELETE CASCADE,
  metric_key VARCHAR(255) NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  step INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_run_metrics_run ON ml_run_metrics(run_id);

CREATE TABLE IF NOT EXISTS ml_run_artifacts (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES ml_runs(id) ON DELETE CASCADE,
  artifact_name VARCHAR(255) NOT NULL,
  artifact_type VARCHAR(100),
  artifact_data JSONB,
  file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_run_artifacts_run ON ml_run_artifacts(run_id);
