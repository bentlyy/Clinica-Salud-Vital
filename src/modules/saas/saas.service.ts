import { pool } from '../../shared/db.js';
import { logger } from '../../utils/logger.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

interface Plan {
  id: number;
  name: string;
  code: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_doctors: number;
  max_patients: number;
  storage_gb: number;
  features: Record<string, boolean>;
  active: boolean;
}

interface Subscription {
  id: number;
  tenant_id: string;
  plan_id: number;
  status: string;
  current_period_start: Date;
  current_period_end: Date;
  trial_end: Date | null;
  canceled_at: Date | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export const getPlans = async (): Promise<Plan[]> => {
  const result = await pool.query<Plan>(
    'SELECT * FROM plans WHERE active = true ORDER BY sort_order ASC'
  );
  return result.rows;
};

export const getPlanByCode = async (code: string): Promise<Plan> => {
  const result = await pool.query<Plan>('SELECT * FROM plans WHERE code = $1', [code]);
  if (result.rows.length === 0) throw new NotFoundError('Plan not found');
  return result.rows[0];
};

export const getPlanById = async (id: number): Promise<Plan> => {
  const result = await pool.query<Plan>('SELECT * FROM plans WHERE id = $1', [id]);
  if (result.rows.length === 0) throw new NotFoundError('Plan not found');
  return result.rows[0];
};

export const getTenantSubscription = async (tenantId: string): Promise<Subscription | null> => {
  const result = await pool.query<Subscription>(
    `SELECT s.* FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.tenant_id = $1 AND s.status IN ('active', 'trialing')
     ORDER BY s.current_period_start DESC LIMIT 1`,
    [tenantId]
  );
  return result.rows[0] || null;
};

export const getTenantPlan = async (tenantId: string): Promise<Plan | null> => {
  const sub = await getTenantSubscription(tenantId);
  if (!sub) return null;
  return getPlanById(sub.plan_id);
};

export const createSubscription = async (
  tenantId: string,
  planCode: string,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<Subscription> => {
  const plan = await getPlanByCode(planCode);

  const existing = await getTenantSubscription(tenantId);
  if (existing) {
    throw new BadRequestError('Tenant already has an active subscription');
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const result = await pool.query<Subscription>(
    `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end, stripe_customer_id, stripe_subscription_id)
     VALUES ($1, $2, 'active', $3, $4, $5, $6) RETURNING *`,
    [tenantId, plan.id, now, periodEnd, stripeCustomerId || null, stripeSubscriptionId || null]
  );

  logger.info(`Subscription created for tenant ${tenantId}`, { plan: planCode });
  return result.rows[0];
};

export const changePlan = async (
  tenantId: string,
  newPlanCode: string,
  stripeSubscriptionId?: string
): Promise<Subscription> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const plan = await getPlanByCode(newPlanCode);
    const sub = await getTenantSubscription(tenantId);
    if (!sub) {
      throw new BadRequestError('No active subscription found');
    }

    const doctorCheck = await checkLimits(tenantId, 'doctors');
    if (plan.max_doctors > -1 && doctorCheck.current > plan.max_doctors) {
      throw new BadRequestError(`Plan ${newPlanCode} allows max ${plan.max_doctors} doctors, but you have ${doctorCheck.current}`);
    }
    const patientCheck = await checkLimits(tenantId, 'patients');
    if (plan.max_patients > -1 && patientCheck.current > plan.max_patients) {
      throw new BadRequestError(`Plan ${newPlanCode} allows max ${plan.max_patients} patients, but you have ${patientCheck.current}`);
    }

    const result = await client.query<Subscription>(
      `UPDATE subscriptions SET plan_id = $1, stripe_subscription_id = COALESCE($3, stripe_subscription_id), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [plan.id, sub.id, stripeSubscriptionId || null]
    );

    await client.query('COMMIT');
    logger.info(`Plan changed for tenant ${tenantId}`, { plan: newPlanCode });
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const cancelSubscription = async (tenantId: string): Promise<void> => {
  const sub = await getTenantSubscription(tenantId);
  if (!sub) throw new BadRequestError('No active subscription found');

  await pool.query(
    `UPDATE subscriptions SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [sub.id]
  );

  logger.info(`Subscription canceled for tenant ${tenantId}`);
};

const ALLOWED_TENANT_CONFIG_FIELDS = new Set(['name', 'locale', 'timezone', 'config']);

export const updateTenantConfig = async (
  tenantId: string,
  data: Record<string, unknown>
): Promise<void> => {
  const sets: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (!ALLOWED_TENANT_CONFIG_FIELDS.has(key)) {
      throw new BadRequestError(`Unknown field: ${key}`);
    }
    if (value !== undefined) {
      sets.push(`${key} = $${paramIdx++}`);
      params.push(value !== null && typeof value === 'object' ? JSON.stringify(value) : (value as string | number | boolean | null));
    }
  }

  if (sets.length === 0) return;

  params.push(tenantId);
  const result = await pool.query(
    `UPDATE tenants SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${paramIdx} RETURNING id`,
    params
  );

  if (result.rows.length === 0) throw new NotFoundError('Tenant not found');
};

export const checkFeatureAccess = async (tenantId: string, featureKey: string): Promise<boolean> => {
  const plan = await getTenantPlan(tenantId);
  if (!plan) return false;

  const planFeatures = plan.features as Record<string, boolean>;
  if (planFeatures[featureKey] === true) return true;

  const override = await pool.query(
    'SELECT enabled FROM tenant_features WHERE tenant_id = $1 AND feature_key = $2',
    [tenantId, featureKey]
  );
  if (override.rows.length > 0) return override.rows[0].enabled;

  return false;
};

export const checkLimits = async (
  tenantId: string,
  resource: 'doctors' | 'patients' | 'storage' | 'ml_predictions' | 'ml_training'
): Promise<{ allowed: boolean; current: number; limit: number }> => {
  const plan = await getTenantPlan(tenantId);
  if (!plan) return { allowed: false, current: 0, limit: 0 };

  let current = 0;
  let limit = 0;

  if (resource === 'doctors') {
    const count = await pool.query(
      'SELECT COUNT(*) as count FROM doctors WHERE tenant_id = $1',
      [tenantId]
    );
    current = parseInt(count.rows[0].count, 10);
    limit = plan.max_doctors;
  } else if (resource === 'patients') {
    const count = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND role IN ('user', 'patient')",
      [tenantId]
    );
    current = parseInt(count.rows[0].count, 10);
    limit = plan.max_patients;
  } else if (resource === 'storage') {
    const usage = await pool.query(
      `SELECT COALESCE(SUM(pg_column_size(clinical_records)), 0) as bytes
       FROM clinical_records WHERE tenant_id = $1`,
      [tenantId]
    );
    current = Math.round(parseInt(usage.rows[0].bytes, 10) / (1024 * 1024));
    limit = plan.storage_gb * 1024;
  } else if (resource === 'ml_predictions') {
    const usage = await pool.query(
      `SELECT COALESCE(SUM(metric_value), 0) as total
       FROM tenant_usage
       WHERE tenant_id = $1 AND metric_key = 'ml_predictions' AND recorded_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      [tenantId]
    );
    current = parseInt(usage.rows[0].total, 10);
    const planFeatures = plan.features as Record<string, unknown>;
    limit = (planFeatures.ml_predictions_limit as number) || (planFeatures.ml === true ? 1000 : 0);
  } else if (resource === 'ml_training') {
    const usage = await pool.query(
      `SELECT COALESCE(SUM(metric_value), 0) as total
       FROM tenant_usage
       WHERE tenant_id = $1 AND metric_key = 'ml_training' AND recorded_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      [tenantId]
    );
    current = parseInt(usage.rows[0].total, 10);
    const planFeatures = plan.features as Record<string, unknown>;
    limit = (planFeatures.ml_training_limit as number) || (planFeatures.ml === true ? 10 : 0);
  }

  return {
    allowed: limit < 0 || current < limit,
    current,
    limit,
  };
};

export const recordUsage = async (
  tenantId: string,
  metricKey: string,
  value: number = 1
): Promise<void> => {
  await pool.query(
    `INSERT INTO tenant_usage (tenant_id, metric_key, metric_value, recorded_at)
     VALUES ($1, $2, $3, CURRENT_DATE)
     ON CONFLICT (tenant_id, metric_key, recorded_at)
     DO UPDATE SET metric_value = tenant_usage.metric_value + EXCLUDED.metric_value`,
    [tenantId, metricKey, value]
  );
};

export const getTenantUsage = async (
  tenantId: string,
  metricKey: string,
  days: number = 30
): Promise<{ date: string; value: number }[]> => {
  const result = await pool.query(
    `SELECT recorded_at::text as date, metric_value as value
     FROM tenant_usage
     WHERE tenant_id = $1 AND metric_key = $2 AND recorded_at >= CURRENT_DATE - $3::integer
     ORDER BY recorded_at ASC`,
    [tenantId, metricKey, days]
  );
  return result.rows;
};

export const getUsageSummary = async (tenantId: string): Promise<Record<string, number>> => {
  const result = await pool.query(
    `SELECT metric_key, SUM(metric_value) as total
     FROM tenant_usage
     WHERE tenant_id = $1 AND recorded_at >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY metric_key`,
    [tenantId]
  );

  const summary: Record<string, number> = {};
  for (const row of result.rows) {
    summary[row.metric_key] = parseInt(row.total, 10);
  }
  return summary;
};

export const onboardTenant = async (data: {
  tenantName: string;
  domain: string;
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
  locale?: string;
  timezone?: string;
  planCode?: string;
}): Promise<{ tenantId: string; message: string }> => {
  const { tenantName, domain, adminEmail, adminPassword, adminName, locale, timezone, planCode } = data;
  const tenantId = domain;

  const existing = await pool.query('SELECT 1 FROM tenants WHERE id = $1 OR domain = $2', [tenantId, domain]);
  if (existing.rows.length > 0) {
    throw new BadRequestError('Tenant with this domain already exists');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO tenants (id, name, domain, locale, timezone, config, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [
        tenantId,
        tenantName,
        domain,
        locale || process.env.APP_LOCALE || 'es',
        timezone || 'America/Santiago',
        JSON.stringify({ company: tenantName, contact_email: adminEmail }),
      ]
    );

    const plan = planCode
      ? await getPlanByCode(planCode)
      : await getPlanByCode('free');

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 14);

    await client.query(
      `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end, trial_end)
       VALUES ($1, $2, 'trialing', $3, $4, $4)`,
      [tenantId, plan.id, now, periodEnd]
    );

    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash(adminPassword, 12);

    await client.query(
      `INSERT INTO users (email, password, name, role, tenant_id, password_changed)
       VALUES ($1, $2, $3, 'admin', $4, true)`,
      [adminEmail, hash, adminName || tenantName, tenantId]
    );

    await client.query('COMMIT');

    try {
      await (await import('../../shared/multi-tenant.service.js')).tenantService.loadFromDB();
    } catch {
    }

    logger.info(`Tenant onboarded: ${tenantId} (${tenantName})`);
    return { tenantId, message: 'Tenant created successfully. Check your email for details.' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
