-- ============================================================
-- 034: Índices con tenant_id líder para tablas con RLS (auditoría 2026-10-13)
-- ============================================================
-- Contexto (hallazgo 🟡 de rendimiento):
--   Las políticas RLS añaden el predicado `tenant_id = current_setting(...)`
--   a cada consulta. Si no existe un índice cuyo PRIMER campo sea tenant_id,
--   el planificador degrada a un full scan filtrado por la política.
--
--   Las tablas señaladas ya tenían índices, pero con tenant_id en posición
--   media/inferior, por lo que no servían como entrada para el predicado RLS:
--     - clinical_records    -> (patient_id, tenant_id, ...), (doctor_id, tenant_id, ...)
--     - doctor_availability -> (doctor_id, day_of_week, tenant_id)
--     - doctor_exceptions   -> (doctor_id, date, tenant_id)
--     - onboarding_documents-> (onboarding_id, tenant_id)
--
--   Esta migración agrega índices compuestos con tenant_id LÍDER,
--   complementarios (no reemplazan) a los existentes.
--
-- Notas:
--   - Idempotente: IF NOT EXISTS.
--   - Aditiva: no elimina ni renombra índices.
-- ============================================================

-- clinical_records: listados por tenant ordenados por fecha
CREATE INDEX IF NOT EXISTS idx_clinical_records_tenant_created
  ON clinical_records (tenant_id, created_at DESC);

-- clinical_records: traza por tenant + reserva (FK)
CREATE INDEX IF NOT EXISTS idx_clinical_records_tenant_booking
  ON clinical_records (tenant_id, booking_id);

-- doctor_availability: horarios por tenant
CREATE INDEX IF NOT EXISTS idx_availability_tenant_doctor_day
  ON doctor_availability (tenant_id, doctor_id, day_of_week);

-- doctor_exceptions: excepciones por tenant
CREATE INDEX IF NOT EXISTS idx_exceptions_tenant_doctor_date
  ON doctor_exceptions (tenant_id, doctor_id, date);

-- onboarding_documents: documentos por tenant
CREATE INDEX IF NOT EXISTS idx_onboarding_doc_tenant
  ON onboarding_documents (tenant_id, onboarding_id);
