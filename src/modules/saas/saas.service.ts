import { pool, superAdminPool } from '../../shared/db.js';
import { logger } from '../../utils/logger.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { insertOnboarding, insertOnboardingDocuments, type OnboardingProfileInput, type OnboardingDocumentInput } from './onboarding.service.js';

export interface Plan {
  id: number;
  name: string;
  code: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  price_monthly_clp: number;
  price_yearly_clp: number;
  max_doctors: number;
  max_patients: number;
  storage_gb: number;
  features: Record<string, boolean>;
  active: boolean;
  sort_order: number;
}

export interface Subscription {
  id: number;
  tenant_id: string;
  plan_id: number;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  canceled_at: string | null;
  mercadopago_preference_id: string | null;
  mercadopago_payment_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionWithPlan extends Subscription {
  plan: Plan;
}

const GRACE_PERIOD_DAYS = 7;

// ─── Plans ───────────────────────────────────────────────

export const getPlans = async (): Promise<Plan[]> => {
  const result = await pool.query(
    `SELECT id, name, code, description, price_monthly, price_yearly,
            price_monthly_clp, price_yearly_clp,
            max_doctors, max_patients, storage_gb, features, active, sort_order
     FROM plans WHERE active = true ORDER BY sort_order ASC`
  );
  return result.rows;
};

export const getPlanByCode = async (code: string): Promise<Plan> => {
  const result = await pool.query(
    `SELECT id, name, code, description, price_monthly, price_yearly,
            price_monthly_clp, price_yearly_clp,
            max_doctors, max_patients, storage_gb, features, active, sort_order
     FROM plans WHERE code = $1`,
    [code]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.SAAS_PLAN_NOT_FOUND);
  return result.rows[0];
};

export const getPlanById = async (id: number): Promise<Plan> => {
  const result = await pool.query(
    `SELECT id, name, code, description, price_monthly, price_yearly,
            price_monthly_clp, price_yearly_clp,
            max_doctors, max_patients, storage_gb, features, active, sort_order
     FROM plans WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.SAAS_PLAN_BY_ID_NOT_FOUND);
  return result.rows[0];
};

// ─── Subscriptions ───────────────────────────────────────

export const getTenantSubscription = async (tenantId: string): Promise<SubscriptionWithPlan | null> => {
  const result = await pool.query(
    `SELECT s.*,
            json_build_object(
              'id', p.id, 'name', p.name, 'code', p.code, 'description', p.description,
              'price_monthly', p.price_monthly, 'price_yearly', p.price_yearly,
              'price_monthly_clp', p.price_monthly_clp, 'price_yearly_clp', p.price_yearly_clp,
              'max_doctors', p.max_doctors, 'max_patients', p.max_patients,
              'storage_gb', p.storage_gb, 'features', p.features, 'active', p.active,
              'sort_order', p.sort_order
            ) as plan
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.tenant_id = $1 AND s.status IN ('active', 'trialing', 'past_due')
     ORDER BY s.created_at DESC LIMIT 1`,
    [tenantId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0] as SubscriptionWithPlan;
};

export const getTenantPlan = async (tenantId: string): Promise<Plan> => {
  const sub = await getTenantSubscription(tenantId);
  if (sub) return sub.plan;
  // Fallback: return free plan
  try {
    return await getPlanByCode('free');
  } catch {
    return {
      id: 0, name: 'Free', code: 'free', description: 'Free plan',
      price_monthly: 0, price_yearly: 0, price_monthly_clp: 0, price_yearly_clp: 0,
      max_doctors: 1, max_patients: 50,
      storage_gb: 1, features: { bookings: true }, active: true, sort_order: 0,
    };
  }
};

export const createSubscription = async (
  tenantId: string,
  planCode: string,
  options?: { trialDays?: number; periodMonths?: number }
): Promise<SubscriptionWithPlan> => {
  const plan = await getPlanByCode(planCode);
  const periodMonths = options?.periodMonths || 1;

  const client = await superAdminPool.connect();
  try {
    await client.query('BEGIN');

    // Check no active subscription exists
    const existing = await client.query(
      `SELECT id FROM subscriptions
       WHERE tenant_id = $1 AND status IN ('active', 'trialing', 'past_due')`,
      [tenantId]
    );
    if (existing.rows.length > 0) {
      throw new BadRequestError(E.SAAS_SUBSCRIPTION_EXISTS);
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + periodMonths);

    const trialEnd = options?.trialDays
      ? new Date(now.getTime() + options.trialDays * 24 * 60 * 60 * 1000)
      : null;

    const status = trialEnd ? 'trialing' : 'active';

    const result = await client.query(
      `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end, trial_end)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tenantId, plan.id, status, now, periodEnd, trialEnd]
    );

    // Create first invoice
    await client.query(
      `INSERT INTO subscription_invoices (tenant_id, subscription_id, amount, status, period_start, period_end, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tenantId, result.rows[0].id, plan.price_monthly_clp, status === 'active' ? 'paid' : 'pending', now, periodEnd, status === 'active' ? now : null]
    );

    await client.query('COMMIT');
    logger.info(`Subscription created: tenant=${tenantId} plan=${planCode} status=${status}`);

    return { ...result.rows[0], plan } as SubscriptionWithPlan;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const changePlan = async (
  tenantId: string,
  newPlanCode: string
): Promise<{ subscription: SubscriptionWithPlan; message: string }> => {
  const newPlan = await getPlanByCode(newPlanCode);

  const client = await superAdminPool.connect();
  try {
    await client.query('BEGIN');

    const subResult = await client.query(
      `SELECT s.*, p.code as old_plan_code
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.tenant_id = $1 AND s.status IN ('active', 'trialing')
       FOR UPDATE`,
      [tenantId]
    );

    if (subResult.rows.length === 0) {
      throw new BadRequestError(E.SAAS_NO_SUBSCRIPTION);
    }

    const sub = subResult.rows[0];

    if (sub.plan_id === newPlan.id) {
      throw new BadRequestError(E.SAAS_ALREADY_ON_PLAN);
    }

    await client.query(
      `UPDATE subscriptions SET plan_id = $1, updated_at = NOW() WHERE id = $2`,
      [newPlan.id, sub.id]
    );

    // Create invoice for plan change
    await client.query(
      `INSERT INTO subscription_invoices (tenant_id, subscription_id, amount, status, period_start, period_end, paid_at)
       VALUES ($1, $2, $3, 'paid', NOW(), $4, NOW())`,
      [tenantId, sub.id, newPlan.price_monthly_clp, sub.current_period_end]
    );

    await client.query('COMMIT');
    logger.info(`Plan changed: tenant=${tenantId} from=${sub.old_plan_code} to=${newPlanCode}`);

    const updated = await getTenantSubscription(tenantId);
    return {
      subscription: updated!,
      message: `Plan changed from '${sub.old_plan_code}' to '${newPlanCode}'`,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const cancelSubscription = async (tenantId: string): Promise<{ message: string }> => {
  const client = await superAdminPool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE subscriptions
       SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
       WHERE tenant_id = $1 AND status IN ('active', 'trialing', 'past_due')
       RETURNING id`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      throw new BadRequestError(E.SAAS_NO_ACTIVE_SUBSCRIPTION);
    }

    await client.query('COMMIT');
    logger.info(`Subscription canceled: tenant=${tenantId}`);
    return { message: 'Subscription canceled. Access continues until end of current period.' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ─── Grace Period & Past Due ─────────────────────────────

export const handlePastDueSubscriptions = async (): Promise<void> => {
  const result = await pool.query(
    `SELECT s.id, s.tenant_id, s.current_period_end, p.code as plan_code
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.status = 'past_due'`
  );

  const now = new Date();

  for (const sub of result.rows) {
    const periodEnd = new Date(sub.current_period_end);
    const graceEnd = new Date(periodEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    if (now > graceEnd) {
      // Grace period expired: downgrade to free plan
      const freePlan = await getPlanByCode('free');
      await superAdminPool.query(
        `UPDATE subscriptions SET plan_id = $1, status = 'canceled', canceled_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [freePlan.id, sub.id]
      );
      logger.warn(`Subscription expired (grace period): tenant=${sub.tenant_id} downgraded to free`);
    } else {
      logger.info(`Subscription past_due: tenant=${sub.tenant_id} grace ends ${graceEnd.toISOString()}`);
    }
  }
};

// ─── Limits & Usage ──────────────────────────────────────

export const checkLimits = async (
  tenantId: string,
  metricKey: string
): Promise<{ allowed: boolean; current: number; limit: number }> => {
  const plan = await getTenantPlan(tenantId);
  const limitMap: Record<string, number> = {
    doctors: plan.max_doctors,
    patients: plan.max_patients,
    storage: plan.storage_gb,
  };
  const limit = limitMap[metricKey] ?? -1;
  if (limit === -1) return { allowed: true, current: 0, limit: -1 };

  const result = await pool.query(
    `SELECT COALESCE(SUM(metric_value), 0)::int as current
     FROM tenant_usage
     WHERE tenant_id = $1 AND metric_key = $2
       AND recorded_at >= date_trunc('month', CURRENT_DATE)`,
    [tenantId, metricKey]
  );
  const current = result.rows[0]?.current ?? 0;
  return { allowed: current < limit, current, limit };
};

export const recordUsage = async (
  tenantId: string,
  metricKey: string,
  value: number
): Promise<void> => {
  await superAdminPool.query(
    `INSERT INTO tenant_usage (tenant_id, metric_key, metric_value, recorded_at)
     VALUES ($1, $2, $3, CURRENT_DATE)
     ON CONFLICT (tenant_id, metric_key, recorded_at)
     DO UPDATE SET metric_value = tenant_usage.metric_value + $3`,
    [tenantId, metricKey, value]
  );
};

export const getTenantUsage = async (
  tenantId: string
): Promise<{ date: string; metric_key: string; value: number }[]> => {
  const result = await pool.query(
    `SELECT recorded_at::text as date, metric_key, metric_value as value
     FROM tenant_usage
     WHERE tenant_id = $1
     ORDER BY recorded_at DESC, metric_key
     LIMIT 100`,
    [tenantId]
  );
  return result.rows;
};

export const getUsageSummary = async (
  tenantId: string
): Promise<Record<string, number>> => {
  const result = await pool.query(
    `SELECT metric_key, SUM(metric_value)::bigint as total
     FROM tenant_usage
     WHERE tenant_id = $1
       AND recorded_at >= date_trunc('month', CURRENT_DATE)
     GROUP BY metric_key`,
    [tenantId]
  );
  const summary: Record<string, number> = {};
  for (const row of result.rows) {
    summary[row.metric_key] = Number(row.total);
  }
  return summary;
};

// ─── Features ────────────────────────────────────────────

export const checkFeatureAccess = async (featureKey: string, tenantId: string): Promise<boolean> => {
  const result = await pool.query(`
    SELECT COALESCE(
      (SELECT enabled::text FROM tenant_features WHERE tenant_id = $1 AND feature_key = $2),
      (SELECT (features->>$2)::text FROM plans p
       JOIN subscriptions s ON s.plan_id = p.id
       WHERE s.tenant_id = $1 AND s.status IN ('active', 'trialing')
       ORDER BY s.created_at DESC LIMIT 1),
      'false'
    )::boolean as enabled
  `, [tenantId, featureKey]);
  return result.rows[0]?.enabled ?? false;
};

export const getTenantFeatures = async (tenantId: string): Promise<Record<string, boolean>> => {
  const featureKeys = [
    'bookings', 'clinical_records', 'laboratory', 'analytics',
    'api_access', 'white_label', 'custom_domain', 'sms', 'advanced_reports',
  ];
  const entries = await Promise.all(
    featureKeys.map(async (key) => [key, await checkFeatureAccess(key, tenantId)] as const)
  );
  return Object.fromEntries(entries);
};

// ─── Tenant Config ───────────────────────────────────────

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
      throw new BadRequestError(E.SAAS_UNKNOWN_FIELD, 'Unknown field: ' + key);
    }
    if (value !== undefined) {
      sets.push(`${key} = $${paramIdx++}`);
      params.push(value !== null && typeof value === 'object' ? JSON.stringify(value) : (value as string | number | boolean | null));
    }
  }

  if (sets.length === 0) return;

  params.push(tenantId);
  const result = await superAdminPool.query(
    `UPDATE tenants SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${paramIdx} RETURNING id`,
    params
  );

  if (result.rows.length === 0) throw new BadRequestError(E.SAAS_TENANT_NOT_FOUND);
};

// ─── Onboarding ──────────────────────────────────────────

export const onboardTenant = async (data: {
  tenantName: string;
  domain: string;
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
  locale?: string;
  timezone?: string;
  planCode?: string;
  profile?: OnboardingProfileInput;
  documents?: OnboardingDocumentInput[];
}): Promise<{ tenantId: string; subscription: SubscriptionWithPlan | null; message: string }> => {
  const { tenantName, domain, adminEmail, adminPassword, adminName, locale, timezone, planCode, profile, documents } = data;
  const tenantId = domain;

  const client = await superAdminPool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT 1 FROM tenants WHERE id = $1 OR domain = $2 FOR UPDATE', [tenantId, domain]);
    if (existing.rows.length > 0) {
      throw new BadRequestError(E.SAAS_DOMAIN_EXISTS);
    }

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

    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash(adminPassword, 12);

    const userResult = await client.query(
      `INSERT INTO users (email, password, name, role, tenant_id, password_changed)
       VALUES ($1, $2, $3, 'admin', $4, true)
       RETURNING id`,
      [adminEmail, hash, adminName || tenantName, tenantId]
    );
    const adminUserId = (userResult.rows?.[0] as { id?: number } | undefined)?.id ?? null;

    // Create subscription if plan specified
    let subscription: SubscriptionWithPlan | null = null;
    if (planCode) {
      try {
        const plan = await getPlanByCode(planCode);
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const subResult = await client.query(
          `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
           VALUES ($1, $2, 'active', $3, $4)
           RETURNING *`,
          [tenantId, plan.id, now, periodEnd]
        );

        await client.query(
          `INSERT INTO subscription_invoices (tenant_id, subscription_id, amount, status, period_start, period_end, paid_at)
           VALUES ($1, $2, $3, 'paid', $4, $5, $6)`,
          [tenantId, subResult.rows[0].id, plan.price_monthly_clp, now, periodEnd, plan.price_monthly_clp === 0 ? now : null]
        );

        subscription = { ...subResult.rows[0], plan } as SubscriptionWithPlan;
      } catch (err) {
        logger.warn(`Failed to create subscription for plan '${planCode}': ${err}`);
      }
    }

    // Perfil de incorporación (tenant_onboarding)
    const onboarding = await insertOnboarding(
      { query: (text, params) => client.query(text, params) },
      {
        tenantId,
        companyName: tenantName,
        adminEmail,
        adminName: adminName || null,
        planCode: planCode || 'free',
        profile: profile || {},
      }
    );

    // Documentos adjuntos del formulario público (si vienen)
    if (documents && documents.length > 0) {
      await insertOnboardingDocuments(
        { query: (text, params) => client.query(text, params) },
        { onboardingId: onboarding.id, tenantId, uploadedBy: adminUserId, documents },
      );
    }

    await client.query('COMMIT');

    try {
      await (await import('../../shared/multi-tenant.service.js')).tenantService.loadFromDB();
    } catch (err) {
      logger.error('[SaaS] Failed to reload tenant cache:', err);
    }

    logger.info(`Tenant onboarded: ${tenantId} (${tenantName}) plan=${planCode || 'none'}`);
    return {
      tenantId,
      subscription,
      message: subscription
        ? `Tenant created with plan '${planCode}'`
        : 'Tenant created (no plan assigned)',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ─── Mercado Pago webhook reconciliation ────────────────

/**
 * Match a Mercado Pago payment id to a local subscription. Used by the
 * webhook handler to reconcile a confirmed payment against the local DB.
 */
const findSubscriptionByMpPaymentId = async (
  mpPaymentId: string
): Promise<{ id: number; tenant_id: string; plan_id: number } | null> => {
  if (!mpPaymentId) return null;
  const result = await pool.query(
    `SELECT id, tenant_id, plan_id FROM subscriptions WHERE mercadopago_payment_id = $1`,
    [mpPaymentId]
  );
  return result.rows[0] || null;
};

const activateSubscriptionForPayment = async (payment: {
  id: string;
  external_reference: string | null;
  metadata?: { plan_code?: string; preference_id?: string; tenant_id?: string };
}): Promise<void> => {
  const tenantId = payment.external_reference || payment.metadata?.tenant_id;
  const planCode = payment.metadata?.plan_code;
  if (!tenantId || !planCode) {
    logger.warn('[Mercado Pago] payment without tenant metadata — skipping');
    return;
  }

  const plan = await getPlanByCode(planCode);
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const client = await superAdminPool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id FROM subscriptions
       WHERE tenant_id = $1 AND status IN ('active', 'trialing', 'past_due')
       FOR UPDATE`,
      [tenantId]
    );

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE subscriptions
         SET status = 'active', plan_id = $1,
             mercadopago_preference_id = $2, mercadopago_payment_id = $3,
             current_period_start = $4, current_period_end = $5,
             updated_at = NOW()
         WHERE id = $6`,
        [plan.id, payment.metadata?.preference_id || null, payment.id, now, periodEnd, existing.rows[0].id]
      );
    } else {
      const inserted = await client.query(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end, mercadopago_preference_id, mercadopago_payment_id)
         VALUES ($1, $2, 'active', $3, $4, $5, $6)
         RETURNING id`,
        [tenantId, plan.id, now, periodEnd, payment.metadata?.preference_id || null, payment.id]
      );
      if (plan.price_monthly_clp > 0) {
        await client.query(
          `INSERT INTO subscription_invoices (tenant_id, subscription_id, amount, status, period_start, period_end, mercadopago_payment_id, paid_at)
           VALUES ($1, $2, $3, 'paid', $4, $5, $6, $7)`,
          [tenantId, inserted.rows[0].id, plan.price_monthly_clp, now, periodEnd, payment.id, now]
        );
      }
    }

    await client.query('COMMIT');
    logger.info(`[Mercado Pago] payment approved → subscription active tenant=${tenantId} plan=${planCode} payment=${payment.id}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const handleMercadoPagoPaymentApproved = async (
  payment: { id: string; external_reference: string | null; metadata?: { plan_code?: string; preference_id?: string } }
): Promise<void> => {
  const already = await findSubscriptionByMpPaymentId(payment.id);
  if (already) {
    logger.info(`[Mercado Pago] payment ${payment.id} ya conciliado — skipping idempotente`);
    return;
  }
  await activateSubscriptionForPayment(payment);
};
