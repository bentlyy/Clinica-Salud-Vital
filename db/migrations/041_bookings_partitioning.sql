-- Prepare bookings table for partitioning by date range
-- This migration adds infrastructure for future partitioning

-- 1. Create the partition function that will be used by the cron job
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
  next_month_start DATE;
  partition_name TEXT;
  partition_date TEXT;
BEGIN
  next_month_start := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  partition_name := 'bookings_' || TO_CHAR(next_month_start, 'YYYY_MM');
  partition_date := TO_CHAR(next_month_start, 'YYYY-MM-DD');
  
  -- Check if partition already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %I (LIKE bookings INCLUDING ALL) INHERITS (bookings)', 
      partition_name
    );
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I CHECK (date >= DATE %L AND date < DATE %L + INTERVAL ''1 month'')',
      partition_name,
      'ck_' || partition_name || '_date_range',
      partition_date,
      partition_date
    );
    RAISE NOTICE 'Created partition: %', partition_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Create function to route inserts to correct partition
CREATE OR REPLACE FUNCTION bookings_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
  partition_name TEXT;
BEGIN
  partition_name := 'bookings_' || TO_CHAR(NEW.date, 'YYYY_MM');
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %I (LIKE bookings INCLUDING ALL) INHERITS (bookings)',
      partition_name
    );
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I CHECK (date >= DATE %L AND date < DATE %L + INTERVAL ''1 month'')',
      partition_name,
      'ck_' || partition_name || '_date_range',
      DATE_TRUNC('month', NEW.date),
      DATE_TRUNC('month', NEW.date) + INTERVAL '1 month'
    );
  END IF;
  
  EXECUTE format('INSERT INTO %I VALUES ($1.*)', partition_name) USING NEW;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Create archive function for old partitions
CREATE OR REPLACE FUNCTION archive_old_partitions(retention_months INTEGER DEFAULT 36)
RETURNS INTEGER AS $$
DECLARE
  partition_record RECORD;
  archived_count INTEGER := 0;
BEGIN
  FOR partition_record IN
    SELECT relname FROM pg_class 
    WHERE relname ~ '^bookings_\d{4}_\d{2}$'
    AND relname < 'bookings_' || TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - retention_months * INTERVAL '1 month'), 'YYYY_MM')
  LOOP
    EXECUTE format('ALTER TABLE %I SET TABLESPACE archive_tablespace', partition_record.relname);
    archived_count := archived_count + 1;
  END LOOP;
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Create comprehensive indexes on bookings (covering tenant isolation)
-- These replace the existing simpler indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_date ON bookings(tenant_id, date DESC) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_doctor_date ON bookings(tenant_id, doctor_id, date) WHERE status != 'cancelled';
