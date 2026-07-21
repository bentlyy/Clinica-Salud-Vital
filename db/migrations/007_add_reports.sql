CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'generating',
  config JSONB NOT NULL DEFAULT '{}',
  result_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_tenant ON reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
