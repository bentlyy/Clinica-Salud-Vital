import { pool } from '../../shared/db.js';
import { logger } from '../../utils/logger.js';
import { BadRequestError } from '../../utils/errors.js';

const DEFAULT_PLAN = {
  id: 0,
  name: 'Default',
  code: 'default',
  description: 'Single plan',
  price_monthly: 0,
  price_yearly: 0,
  max_doctors: -1,
  max_patients: -1,
  storage_gb: 10,
  features: {} as Record<string, boolean>,
  active: true,
};

export const getPlans = async (): Promise<typeof DEFAULT_PLAN[]> => [DEFAULT_PLAN];

export const getPlanByCode = async (): Promise<typeof DEFAULT_PLAN> => DEFAULT_PLAN;

export const getPlanById = async (): Promise<typeof DEFAULT_PLAN> => DEFAULT_PLAN;

export const getTenantSubscription = async (): Promise<null> => null;

export const getTenantPlan = async (): Promise<typeof DEFAULT_PLAN> => DEFAULT_PLAN;

export const createSubscription = async (): Promise<{ status: string; message: string }> => {
  return { status: 'active', message: 'Subscription active' };
};

export const changePlan = async (): Promise<{ plan_code: string; message: string }> => {
  return { plan_code: 'default', message: 'Plan unchanged (single plan)' };
};

export const cancelSubscription = async (): Promise<void> => {
  // No-op: no real cancellation needed
};

export const checkFeatureAccess = async (): Promise<boolean> => true;

export const checkLimits = async (): Promise<{ allowed: boolean; current: number; limit: number }> => {
  return { allowed: true, current: 0, limit: -1 };
};

export const recordUsage = async (): Promise<void> => {
  // No-op: usage tracking removed
};

export const getTenantUsage = async (): Promise<{ date: string; value: number }[]> => [];

export const getUsageSummary = async (): Promise<Record<string, number>> => ({});

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

  if (result.rows.length === 0) throw new BadRequestError('Tenant not found');
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
  const { tenantName, domain, adminEmail, adminPassword, adminName, locale, timezone } = data;
  const tenantId = domain;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT 1 FROM tenants WHERE id = $1 OR domain = $2 FOR UPDATE', [tenantId, domain]);
    if (existing.rows.length > 0) {
      throw new BadRequestError('Tenant with this domain already exists');
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

    await client.query(
      `INSERT INTO users (email, password, name, role, tenant_id, password_changed)
       VALUES ($1, $2, $3, 'admin', $4, true)`,
      [adminEmail, hash, adminName || tenantName, tenantId]
    );

    await client.query('COMMIT');

    try {
      await (await import('../../shared/multi-tenant.service.js')).tenantService.loadFromDB();
    } catch (err) {
      logger.error('[SaaS] Failed to reload tenant cache:', err);
    }

    logger.info(`Tenant onboarded: ${tenantId} (${tenantName})`);
    return { tenantId, message: 'Tenant created successfully.' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
