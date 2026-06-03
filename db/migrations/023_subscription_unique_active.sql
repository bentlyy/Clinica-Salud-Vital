-- Prevent duplicate active subscriptions per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_active_tenant
  ON subscriptions(tenant_id)
  WHERE status IN ('active', 'trialing');
