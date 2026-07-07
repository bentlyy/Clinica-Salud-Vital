-- 003: Lab Areas - Especialización del laboratorio por tipo
CREATE TABLE IF NOT EXISTS lab_areas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

-- Add lab_area_id to lab_tests
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS lab_area_id INTEGER REFERENCES lab_areas(id);
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS result_type VARCHAR(20) DEFAULT 'numeric' CHECK (result_type IN ('numeric', 'text', 'select', 'multiselect', 'graph', 'image'));
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS result_options JSONB; -- for select/multiselect
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS decimals INTEGER DEFAULT 1;
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS unit_alt VARCHAR(50);
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC(10, 4);
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS critical_min NUMERIC(10, 2);
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS critical_max NUMERIC(10, 2);
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS delta_check_pct NUMERIC(5, 2) DEFAULT 20;
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS turnaround_time_min INTEGER; -- SLA in minutes
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS preparation_instructions TEXT;
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS sample_type VARCHAR(50);
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS container_type VARCHAR(50);
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS volume_ml NUMERIC(10, 2);

-- Expand lab_requests statuses
ALTER TABLE lab_requests DROP CONSTRAINT IF EXISTS lab_requests_status_check;
ALTER TABLE lab_requests ADD CONSTRAINT lab_requests_status_check 
  CHECK (status IN ('pending', 'received', 'verified', 'assigned', 'processing', 'qc_review', 'result_entered', 'validated_tech', 'validated_doctor', 'signed', 'delivered', 'cancelled', 'rejected', 'repeated'));

ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS lab_area_id INTEGER REFERENCES lab_areas(id);
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS received_at TIMESTAMP;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS received_by INTEGER REFERENCES users(id);
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id);
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS urgency_reason TEXT;

-- Expand lab_request_items
ALTER TABLE lab_request_items DROP CONSTRAINT IF EXISTS lab_request_items_status_check;
ALTER TABLE lab_request_items ADD CONSTRAINT lab_request_items_status_check 
  CHECK (status IN ('pending', 'received', 'verified', 'assigned', 'processing', 'qc_review', 'result_entered', 'validated_tech', 'validated_doctor', 'signed', 'delivered', 'cancelled', 'rejected', 'repeated'));

ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS lab_area_id INTEGER REFERENCES lab_areas(id);
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS validated_by_tech INTEGER REFERENCES users(id);
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS validated_at_tech TIMESTAMP;
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS validated_by_doctor INTEGER REFERENCES users(id);
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS validated_at_doctor TIMESTAMP;
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS signed_by INTEGER REFERENCES users(id);
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP;
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50);
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false;
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS is_repeated BOOLEAN DEFAULT false;
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS delta_check_status VARCHAR(20);
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS previous_result_id INTEGER REFERENCES lab_request_items(id);
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS assigned_tech_id INTEGER REFERENCES users(id);
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE lab_request_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50);

-- Update trigger for completed_at
CREATE OR REPLACE FUNCTION update_lab_item_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('validated_tech', 'validated_doctor', 'signed', 'delivered') AND OLD.status NOT IN ('validated_tech', 'validated_doctor', 'signed', 'delivered') THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lab_item_completed ON lab_request_items;
CREATE TRIGGER trigger_lab_item_completed
  BEFORE UPDATE ON lab_request_items
  FOR EACH ROW
  EXECUTE FUNCTION update_lab_item_completed_at();

-- Update trigger for lab_requests completed_at
CREATE OR REPLACE FUNCTION update_lab_request_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('delivered', 'cancelled') AND OLD.status NOT IN ('delivered', 'cancelled') THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lab_request_completed ON lab_requests;
CREATE TRIGGER trigger_lab_request_completed
  BEFORE UPDATE ON lab_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_lab_request_completed_at();

-- Seed default lab areas
INSERT INTO lab_areas (name, code, description, icon, color, sort_order, tenant_id) VALUES
  ('Hematología', 'HEM', 'Estudio de la sangre y sus componentes', 'blood', '#ef4444', 1, 'default'),
  ('Bioquímica', 'BIO', 'Análisis de sustancias químicas en sangre', 'flask', '#f59e0b', 2, 'default'),
  ('Hormonas', 'HOR', 'Estudio de hormonas y marcadores endocrinos', 'activity', '#8b5cf6', 3, 'default'),
  ('Inmunología', 'INM', 'Estudio del sistema inmune y anticuerpos', 'shield', '#06b6d4', 4, 'default'),
  ('Microbiología', 'MIC', 'Estudio de microorganismos y cultivos', 'bacteria', '#10b981', 5, 'default'),
  ('Parasitología', 'PAR', 'Estudio de parásitos', 'worm', '#84cc16', 6, 'default'),
  ('Uroanálisis', 'URO', 'Análisis de orina', 'droplet', '#3b82f6', 7, 'default'),
  ('Coagulación', 'COA', 'Estudio de la coagulación sanguínea', 'droplets', '#ec4899', 8, 'default'),
  ('Serología', 'SER', 'Estudio de suero y anticuerpos', 'test-tube', '#14b8a6', 9, 'default')
ON CONFLICT (code) DO NOTHING;
