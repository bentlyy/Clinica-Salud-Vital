-- Performance monitoring infrastructure

-- 1. Track slow queries
CREATE TABLE IF NOT EXISTS slow_query_log (
  id SERIAL PRIMARY KEY,
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  tenant_id TEXT,
  endpoint TEXT,
  occurred_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slow_query_hash ON slow_query_log(query_hash);
CREATE INDEX IF NOT EXISTS idx_slow_query_duration ON slow_query_log(duration_ms DESC);

-- 2. Track table sizes for capacity planning
CREATE TABLE IF NOT EXISTS table_size_snapshot (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_count BIGINT,
  total_size_bytes BIGINT,
  snapshot_at TIMESTAMP DEFAULT NOW()
);

-- 3. Function to capture table sizes
CREATE OR REPLACE FUNCTION capture_table_sizes()
RETURNS INTEGER AS $$
DECLARE
  tbl RECORD;
  captured INTEGER := 0;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE '\_%'
  LOOP
    EXECUTE format(
      'INSERT INTO table_size_snapshot (table_name, row_count, total_size_bytes) 
       SELECT %L, (SELECT reltuples::BIGINT FROM pg_class WHERE relname = %L), 
       pg_total_relation_size(%L)',
      tbl.tablename, tbl.tablename, tbl.tablename
    );
    captured := captured + 1;
  END LOOP;
  RETURN captured;
END;
$$ LANGUAGE plpgsql;
