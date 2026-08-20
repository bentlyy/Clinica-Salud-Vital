CREATE TABLE IF NOT EXISTS jobs (
  id            SERIAL PRIMARY KEY,
  type          VARCHAR(100)  NOT NULL,
  data          JSONB         NOT NULL DEFAULT '{}',
  status        VARCHAR(20)   NOT NULL DEFAULT 'pending',
  attempts      INTEGER       NOT NULL DEFAULT 0,
  max_attempts  INTEGER       NOT NULL DEFAULT 3,
  last_error    TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_pending ON jobs (next_retry_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs (type);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
