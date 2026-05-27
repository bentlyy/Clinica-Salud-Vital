-- Billing Module Migration
-- NOTE: invoices, invoice_items, payments, insurance_claims tables are already
-- created by db/init.sql with a minimal schema. This migration adds the columns
-- needed by the billing module service (billing.service.ts).

-- Invoices table (create if running standalone; ALTER if init.sql already created it)
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  concept VARCHAR(255) NOT NULL,
  description TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  tax_amount NUMERIC(10, 2) DEFAULT 0,
  discount_amount NUMERIC(10, 2) DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded', 'overdue')),
  due_date DATE NOT NULL,
  issued_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- If invoices already exists from init.sql (minimal schema), add missing columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50) UNIQUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS concept VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
-- payment_data used by billing.service.ts updateInvoiceStatus
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_data JSONB;

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  quantity NUMERIC(10, 2) DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to invoice_items if created by init.sql
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10, 2);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS total_price NUMERIC(10, 2);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_date TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to payments if created by init.sql
-- NOTE: init.sql uses 'method' column, not 'payment_method' — keep consistent
ALTER TABLE payments ADD COLUMN IF NOT EXISTS method VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP DEFAULT NOW();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Insurance claims table (matches init.sql column names)
CREATE TABLE IF NOT EXISTS insurance_claims (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  insurance_provider VARCHAR(255) NOT NULL,
  policy_number VARCHAR(100) NOT NULL,
  claim_number VARCHAR(100),
  claim_amount NUMERIC(10, 2) NOT NULL,
  approved_amount NUMERIC(10, 2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'partial')),
  submitted_at TIMESTAMP,
  resolved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to insurance_claims if created by init.sql
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS claim_number VARCHAR(100);
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS approved_amount NUMERIC(10, 2);
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS notes TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_doctor ON invoices(doctor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_invoice ON insurance_claims(invoice_id);

-- Trigger for updated_at (uses shared function from init.sql)
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_insurance_claims_updated_at ON insurance_claims;
CREATE TRIGGER update_insurance_claims_updated_at
  BEFORE UPDATE ON insurance_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
