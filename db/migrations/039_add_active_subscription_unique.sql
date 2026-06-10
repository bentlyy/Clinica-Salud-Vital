-- Ensure only ONE active subscription per tenant
-- This is a partial unique index that only applies to active/trialing subscriptions
DROP INDEX IF EXISTS idx_subscriptions_unique_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_unique_active 
  ON subscriptions(tenant_id) 
  WHERE status IN ('active', 'trialing');
