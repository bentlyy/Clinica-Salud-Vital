-- 030_mercadopago.sql
-- Migración de Stripe a Mercado Pago (Chile, CLP)

-- Planes: precios en CLP (enteros, sin decimales como usa Mercado Pago)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_monthly_clp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_yearly_clp INTEGER NOT NULL DEFAULT 0;

-- Suscripciones: ids de Mercado Pago (preference + payment)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS mercadopago_preference_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

-- Facturas: id del pago Mercado Pago
ALTER TABLE subscription_invoices ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

-- Las facturas de suscripción pasan a facturarse en CLP
ALTER TABLE subscription_invoices ALTER COLUMN currency SET DEFAULT 'CLP';

-- Precios CLP sugeridos para los planes actuales (idempotente, sólo afecta
-- precios que sean 0 o los antiguos valores USD previos a la migración)
UPDATE plans
SET price_monthly_clp = CASE code
    WHEN 'free'       THEN 0
    WHEN 'basic'      THEN 9990
    WHEN 'pro'        THEN 19990
    WHEN 'enterprise' THEN 39990
    ELSE price_monthly_clp
  END,
    price_yearly_clp = CASE code
    WHEN 'free'       THEN 0
    WHEN 'basic'      THEN 99990
    WHEN 'pro'        THEN 199900
    WHEN 'enterprise' THEN 399900
    ELSE price_yearly_clp
  END
WHERE price_monthly_clp = 0 AND code IN ('free', 'basic', 'pro', 'enterprise');

CREATE INDEX IF NOT EXISTS idx_subscriptions_mp_payment ON subscriptions(mercadopago_payment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mp_preference ON subscriptions(mercadopago_preference_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_mp ON subscription_invoices(mercadopago_payment_id);