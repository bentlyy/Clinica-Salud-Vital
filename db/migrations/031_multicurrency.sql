-- 031_multicurrency.sql
-- Moneda por tenant + precios base USD (única fuente de verdad).
-- Los precios USD (plans.price_monthly / price_yearly) son la fuente de verdad.
-- price_monthly_clp / price_yearly_clp quedan deprecados y se eliminan.

-- Moneda y país del tenant (determina facturación y display)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'CLP';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) NOT NULL DEFAULT 'CL';

-- Eliminar columnas CLP deprecadas por la moneda del tenant
ALTER TABLE plans DROP COLUMN IF EXISTS price_monthly_clp;
ALTER TABLE plans DROP COLUMN IF EXISTS price_yearly_clp;

-- Consistencia: facturas de clínica en moneda del tenant (CLP por defecto)
ALTER TABLE invoices ALTER COLUMN currency SET DEFAULT 'CLP';