-- ============================================================
-- POST-SEED OPTIMIZATION — Run after seed completes
-- ============================================================

-- ============================================================
-- 1. VACUUM ANALYZE all tables (update planner statistics)
-- ============================================================
VACUUM ANALYZE;

-- ============================================================
-- 2. EXPLAIN ANALYZE — Key backend queries
-- ============================================================

-- Q1: Login (most critical path)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, email, password, name, role, tenant_id, totp_enabled
FROM users
WHERE email = 'admin@clinic.com'
  AND (tenant_id = 'default' OR (role = 'superadmin' AND tenant_id IS NULL))
LIMIT 1;

-- Q2: Booking list by doctor + date
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT b.*, u.name AS patient_name, u.email AS patient_email
FROM bookings b
JOIN users u ON u.id = b.user_id AND u.tenant_id = b.tenant_id
WHERE b.doctor_id = 1
  AND b.date = CURRENT_DATE
  AND b.tenant_id = 'default'
  AND b.status != 'cancelled'
ORDER BY b.time ASC;

-- Q3: Lab requests listing
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT lr.*, COUNT(lri.id) AS item_count
FROM lab_requests lr
LEFT JOIN lab_request_items lri ON lri.lab_request_id = lr.id AND lri.tenant_id = lr.tenant_id
WHERE lr.tenant_id = 'default'
GROUP BY lr.id
ORDER BY lr.created_at DESC
LIMIT 20;

-- Q4: Clinical records by patient
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT cr.*, d.name AS doctor_name
FROM clinical_records cr
JOIN doctors d ON d.id = cr.doctor_id AND d.tenant_id = cr.tenant_id
WHERE cr.patient_id = 10
  AND cr.tenant_id = 'default'
ORDER BY cr.created_at DESC
LIMIT 20;

-- Q5: Notifications unread count
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE user_id = 10
  AND tenant_id = 'default'
  AND is_read = false;

-- Q6: Invoice listing with join
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT i.*, u.name AS patient_name
FROM invoices i
JOIN users u ON u.id = i.patient_id AND u.tenant_id = i.tenant_id
WHERE i.tenant_id = 'default'
ORDER BY i.created_at DESC
LIMIT 20;

-- Q7: Availability lookup (doctor schedule)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM doctor_availability
WHERE doctor_id = 1
  AND tenant_id = 'default'
  AND day_of_week = EXTRACT(DOW FROM CURRENT_DATE)
  AND active = true;

-- Q8: Audit log search
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM audit_logs
WHERE tenant_id = 'default'
  AND resource_type = 'booking'
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 50;

-- ============================================================
-- 3. INDEX USAGE REPORT
-- ============================================================
SELECT
  schemaname,
  relname AS table_name,
  indexrelname AS index_name,
  pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
  idx_scan AS times_used,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  CASE WHEN idx_scan = 0 THEN 'UNUSED' ELSE 'ACTIVE' END AS status
FROM pg_stat_user_indexes i
JOIN pg_index USING (indexrelid)
WHERE schemaname = 'public'
ORDER BY idx_scan DESC, pg_relation_size(i.indexrelid) DESC;

-- ============================================================
-- 4. TABLE SIZE REPORT
-- ============================================================
SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS table_size,
  pg_size_pretty(pg_indexes_size(relid)) AS index_size,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC;

-- ============================================================
-- 5. CACHE HIT RATIO
-- ============================================================
SELECT
  sum(blks_hit) AS cache_hits,
  sum(blks_read) AS disk_reads,
  round(100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2) AS cache_hit_pct
FROM pg_stat_database
WHERE datname = current_database();
