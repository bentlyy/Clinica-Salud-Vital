-- ============================================================
-- 026: Tenant Onboarding — formulario de incorporación de clínicas
-- ============================================================
-- Contexto: cuando una clínica contrata el servicio se crea su
-- tenant + usuario admin y se guarda un perfil de incorporación
-- (tenant_onboarding) con campos requeridos y opcionales, más los
-- documentos adjuntos (contrato, licencia, RUT, etc.) en
-- onboarding_documents.
--
-- Nota: el aislamiento por tenant se maneja en la capa de servicio
-- (WHERE tenant_id = $X y superAdminPool para el panel multi-tenant),
-- igual que las tablas SaaS (plans, subscriptions). No se activa RLS
-- aquí para evitar problemas de orden con security.sql; las queries
-- siempre filtran por tenant_id.
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_onboarding (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  address TEXT,
  postal_code TEXT,
  phone TEXT,
  website TEXT,
  license_number TEXT,
  legal_entity_type TEXT,
  legal_representative_name TEXT,
  legal_representative_email TEXT,
  specialties TEXT[],
  doctor_count INT,
  operating_hours JSONB,
  notes TEXT,
  plan_code TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_name TEXT,
  admin_email TEXT NOT NULL,
  admin_phone TEXT,
  completeness_pct INT NOT NULL DEFAULT 0,
  missing_fields TEXT[],
  approved_by INT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_onboarding_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_onboarding_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS onboarding_documents (
  id SERIAL PRIMARY KEY,
  onboarding_id INT NOT NULL,
  tenant_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('contract', 'license', 'tax_id', 'constitution', 'logo', 'other')),
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INT,
  uploaded_by INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_onboarding_doc FOREIGN KEY (onboarding_id) REFERENCES tenant_onboarding(id) ON DELETE CASCADE,
  CONSTRAINT fk_onboarding_doc_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tenant ON tenant_onboarding(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON tenant_onboarding(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_doc ON onboarding_documents(onboarding_id, tenant_id);

-- Permisos para roles usados por la app (solo si el rol existe; en PostgreSQL
-- gestionados el rol de conexión puede llamarse distinto, y omitimos sin fallar
-- para que la migración se registre siempre y no se reintente en cada boot).
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'clinic_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tenant_onboarding TO clinic_app';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE onboarding_documents TO clinic_app';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE tenant_onboarding_id_seq TO clinic_app';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE onboarding_documents_id_seq TO clinic_app';
  ELSE
    RAISE WARNING 'clinic_app no existe - omitiendo GRANTs de onboarding';
  END IF;
END $$;

-- Permisos para clinic_superadmin (solo si el rol existe; en PostgreSQL
-- gestionados donde 025 no pudo crear el rol, se omiten sin fallar).
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'clinic_superadmin') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tenant_onboarding TO clinic_superadmin';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE onboarding_documents TO clinic_superadmin';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE tenant_onboarding_id_seq TO clinic_superadmin';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE onboarding_documents_id_seq TO clinic_superadmin';
  ELSE
    RAISE WARNING 'clinic_superadmin no existe - omitiendo GRANTs de onboarding';
  END IF;
END $$;