-- ============================================================
-- 028: Performance — índice laboratorio / analytics
-- ============================================================
-- Las 8 consultas del módulo "lab analytics" (getAnalyticsData) y el
-- dashboard laboratorio filtran por (tenant_id, created_at >= ...):
--   - daily (30 días), monthly (12 meses)
--   - by_doctor, by_area, top_tests, revenue, repeat_rate, sla
-- Con una única condición compuesta el planificador usa Index Range
-- Scan + GROUP BY en vez de seq scan por tenant.
-- Índice aditivo e idempotente. No requiere cambios de código.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_lab_requests_tenant_created
  ON lab_requests (tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_lab_request_items_tenant_created
  ON lab_request_items (tenant_id, created_at);