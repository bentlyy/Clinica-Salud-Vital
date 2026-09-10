-- ============================================================
-- 029: Performance — eliminar índices duplicados exactos
-- ============================================================
-- Detección: en pg_index se encontraron 4 pares de índices con la
-- MISMA definición exacta (mismas columnas/orden, opclass, opciones,
-- unicidad y sin filtro parcial) en una misma tabla:
--
--   booking_series        idx_booking_series_user        (= idx_booking_series_tenant_user)
--   clinic_holidays       idx_holiday_tenant_date        (= idx_clinic_holidays_tenant_date)
--   notifications         idx_notif_tenant_user_read     (= idx_notifications_user_read)
--   webhook_subscriptions idx_webhook_sub_tenant_active  (= idx_webhook_sub_tenant_active)
--
-- Se conserva la versión definida en db/init.sql (fuente de verdad del
-- schema) y se elimina la réplica creada por las migraciones 016-019.
-- Overhead evitado: 4 índices, es decir ~duplicación de escritura y
-- RAM en esas tablas. DROP es idempotente (IF EXISTS): en un esquema
-- fresco 029 se aplica después de que init.sql + migraciones hayan
-- creado ambos, así todo converge al mismo estado.
-- ============================================================

DROP INDEX IF EXISTS idx_booking_series_user;
DROP INDEX IF EXISTS idx_holiday_tenant_date;
DROP INDEX IF EXISTS idx_notif_tenant_user_read;
DROP INDEX IF EXISTS idx_webhook_sub_tenant_active;