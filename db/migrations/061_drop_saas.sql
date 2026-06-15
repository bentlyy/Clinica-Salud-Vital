-- Drop SaaS/multi-tenant tables (simplified to single plan)
DROP TABLE IF EXISTS subscription_invoices CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS tenant_usage CASCADE;
DROP TABLE IF EXISTS tenant_features CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS webhook_deliveries CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;
