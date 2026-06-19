import { pool } from '../../shared/db.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

interface TenantRow {
  id: string;
  name: string;
  domain: string;
  locale: string;
  timezone: string;
  config: Record<string, unknown>;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export const listTenants = async (
  page: number = 1,
  limit: number = 20,
  filters?: { active?: boolean; search?: string }
): Promise<{ data: TenantRow[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
  const conditions: string[] = ['1=1'];
  const params: (string | number | boolean)[] = [];
  let paramIdx = 1;

  if (filters?.active !== undefined) {
    conditions.push(`t.active = $${paramIdx++}`);
    params.push(filters.active);
  }

  if (filters?.search) {
    conditions.push(`(t.name ILIKE $${paramIdx} OR t.id ILIKE $${paramIdx} OR t.domain ILIKE $${paramIdx})`);
    params.push(`%${filters.search}%`);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM tenants t WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const result = await pool.query(
    `SELECT t.*,
        (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id)::int AS total_bookings,
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id)::int AS total_users,
        (SELECT COUNT(*) FROM doctors d WHERE d.tenant_id = t.id)::int AS total_doctors
     FROM tenants t WHERE ${whereClause}
     ORDER BY t.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    params
  );

  const totalPages = Math.ceil(total / limit);

  return {
    data: result.rows,
    pagination: { page, limit, total, totalPages },
  };
};

export const getTenantDetail = async (tenantId: string): Promise<{
  tenant: TenantRow;
  stats: Record<string, number>;
  subscription: Record<string, unknown> | null;
}> => {
  const tenantResult = await pool.query<TenantRow>('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  if (tenantResult.rows.length === 0) throw new NotFoundError('Tenant not found');
  const tenant = tenantResult.rows[0];

  const statsResult = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role IN ('user', 'patient')) as patient_count,
      (SELECT COUNT(*) FROM doctors WHERE tenant_id = $1) as doctor_count,
      (SELECT COUNT(*) FROM bookings WHERE tenant_id = $1) as booking_count,
      (SELECT COUNT(*) FROM clinical_records WHERE tenant_id = $1) as clinical_record_count,
      (SELECT COUNT(*) FROM invoices WHERE tenant_id = $1) as invoice_count,
      (SELECT COUNT(*) FROM lab_requests WHERE tenant_id = $1) as lab_request_count
  `, [tenantId]);

  const subResult = await pool.query(
    `SELECT s.*, p.name as plan_name, p.code as plan_code
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.tenant_id = $1 AND s.status IN ('active', 'trialing')
     ORDER BY s.current_period_start DESC LIMIT 1`,
    [tenantId]
  );

  return {
    tenant,
    stats: statsResult.rows[0] || {},
    subscription: subResult.rows[0] || null,
  };
};

const ALLOWED_TENANT_FIELDS = new Set(['name', 'locale', 'timezone', 'active', 'config']);

export const updateTenant = async (
  tenantId: string,
  data: Partial<Pick<TenantRow, 'name' | 'locale' | 'timezone' | 'active' | 'config'>>
): Promise<TenantRow> => {
  const sets: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (!ALLOWED_TENANT_FIELDS.has(key)) {
      throw new BadRequestError(`Unknown field: ${key}`);
    }
    if (value !== undefined) {
      sets.push(`${key} = $${paramIdx++}`);
      params.push(value !== null && typeof value === 'object' ? JSON.stringify(value) : (value as string | number | boolean | null));
    }
  }

  if (sets.length === 0) throw new BadRequestError('No fields to update');

  params.push(tenantId);
  const result = await pool.query<TenantRow>(
    `UPDATE tenants SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${paramIdx} RETURNING *`,
    params
  );
  if (result.rows.length === 0) throw new NotFoundError('Tenant not found');

  try {
    const { tenantService } = await import('../../shared/multi-tenant.service.js');
    await tenantService.loadFromDB();
  } catch (err: unknown) {
    logger.error('[SuperAdmin] Failed to reload tenant cache:', err);
  }

  return result.rows[0];
};

export const deleteTenant = async (tenantId: string, deletedBy?: number): Promise<void> => {
  const result = await pool.query(
    'UPDATE tenants SET active = false, deleted_at = NOW(), deleted_by = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING id',
    [tenantId, deletedBy || null]
  );
  if (result.rows.length === 0) throw new NotFoundError('Tenant not found or already deleted');

  // Revocar todos los refresh tokens del tenant
  await pool.query(
    'UPDATE refresh_tokens SET revoked = true WHERE tenant_id = $1',
    [tenantId]
  );

  // Marcar usuarios como inactivos
  await pool.query(
    'UPDATE users SET active = false WHERE tenant_id = $1 AND active = true',
    [tenantId]
  );
};

interface ListUsersFilters {
  tenantId?: string;
  role?: string;
  search?: string;
}

export const listUsers = async (
  page: number = 1,
  limit: number = 50,
  filters?: ListUsersFilters
): Promise<{ data: Record<string, unknown>[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
  const conditions: string[] = ['1=1'];
  const params: (string | number)[] = [];
  let paramIdx = 1;

  if (filters?.tenantId) {
    conditions.push(`u.tenant_id = $${paramIdx++}`);
    params.push(filters.tenantId);
  }

  if (filters?.role) {
    conditions.push(`u.role = $${paramIdx++}`);
    params.push(filters.role);
  }

  if (filters?.search) {
    conditions.push(`(u.name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`);
    params.push(`%${filters.search}%`);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const result = await pool.query(
    `SELECT u.id, u.email, u.name, u.role, u.rut, u.phone, u.tenant_id, u.active,
            u.password_changed, u.totp_enabled, u.created_at, u.last_activity_at
     FROM users u WHERE ${whereClause}
     ORDER BY u.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    params
  );

  const totalPages = Math.ceil(total / limit);

  return {
    data: result.rows.map((r: Record<string, unknown>) => ({
      id: r.id, email: r.email, name: r.name, role: r.role,
      rut: r.rut, phone: r.phone, tenant_id: r.tenant_id, active: r.active,
      password_changed: r.password_changed, totp_enabled: r.totp_enabled,
      created_at: r.created_at, last_activity_at: r.last_activity_at,
    })),
    pagination: { page, limit, total, totalPages },
  };
};

export const setUserActive = async (userId: number, active: boolean, tenantId?: string): Promise<Record<string, unknown>> => {
  const result = await pool.query(
    `UPDATE users SET active = $1 WHERE id = $2${tenantId ? ' AND tenant_id = $3' : ''} RETURNING id, email, name, role, active, tenant_id`,
    tenantId ? [active, userId, tenantId] : [active, userId]
  );
  if (result.rows.length === 0) throw new NotFoundError('User not found');
  return result.rows[0];
};

export const getGlobalStats = async (): Promise<{
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_doctors: number;
  total_bookings: number;
  total_revenue: number;
}> => {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM tenants) as total_tenants,
      (SELECT COUNT(*) FROM tenants WHERE active = true) as active_tenants,
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM doctors) as total_doctors,
      (SELECT COUNT(*) FROM bookings) as total_bookings,
      (SELECT COALESCE(SUM(amount), 0) FROM subscription_invoices WHERE status = 'paid') as total_revenue
  `);
  return result.rows[0];
};

export const getGlobalDashboard = async (): Promise<Record<string, unknown>> => {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM tenants)::int AS total_tenants,
      (SELECT COUNT(*) FROM tenants WHERE active = true)::int AS active_tenants,
      (SELECT COUNT(*) FROM tenants WHERE active = false)::int AS inactive_tenants,
      (SELECT COUNT(*) FROM users)::int AS total_users,
      (SELECT COUNT(*) FILTER (WHERE role = 'admin') FROM users)::int AS admin_users,
      (SELECT COUNT(*) FILTER (WHERE role IN ('user', 'patient')) FROM users)::int AS patient_users,
      (SELECT COUNT(*) FROM doctors)::int AS total_doctors,
      (SELECT COUNT(*) FROM bookings)::int AS total_bookings,
      (SELECT COUNT(*) FILTER (WHERE status = 'confirmed' OR confirmed = true) FROM bookings)::int AS confirmed_bookings,
      (SELECT COUNT(*) FILTER (WHERE status = 'cancelled') FROM bookings)::int AS cancelled_bookings,
      (SELECT COALESCE(SUM(amount), 0) FROM subscription_invoices WHERE status = 'paid')::numeric AS total_revenue,
      (SELECT COALESCE(SUM(amount), 0) FROM subscription_invoices WHERE status = 'paid' AND paid_at >= NOW() - INTERVAL '30 days')::numeric AS mrr,
      (SELECT COUNT(*) FILTER (WHERE status IN ('active', 'trialing')) FROM subscriptions)::int AS active_subscriptions,
      (SELECT COUNT(*) FILTER (WHERE status = 'canceled') FROM subscriptions)::int AS canceled_subscriptions,
      (SELECT COUNT(*) FILTER (WHERE status = 'trialing') FROM subscriptions)::int AS trialing_subscriptions
  `);
  return result.rows[0];
};

export const getPlanDistribution = async (): Promise<{ plan: string; code: string; count: string }[]> => {
  const result = await pool.query(`
    SELECT p.name AS plan, p.code, COUNT(*)::text AS count
    FROM subscriptions s
    JOIN plans p ON p.id = s.plan_id
    WHERE s.status IN ('active', 'trialing')
    GROUP BY p.id, p.name, p.code
    ORDER BY count DESC
  `);
  return result.rows;
};

export const getTopTenants = async (
  limit: number = 10,
  metric: 'bookings' | 'users' | 'doctors' | 'revenue' = 'bookings'
): Promise<Record<string, unknown>[]> => {
  const metricMap: Record<string, string> = {
    bookings: '(SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id)::int',
    users: '(SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id)::int',
    doctors: '(SELECT COUNT(*) FROM doctors d WHERE d.tenant_id = t.id)::int',
    revenue: '(SELECT COALESCE(SUM(si.amount), 0) FROM subscription_invoices si WHERE si.tenant_id = t.id AND si.status = \'paid\')::numeric',
  };
  const metricSql = metricMap[metric] || metricMap.bookings;

  const result = await pool.query(`
    SELECT
      t.id, t.name, t.domain, t.active, t.created_at,
      ${metricSql} AS metric_value,
      (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id)::int AS total_bookings,
      (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id)::int AS total_users,
      (SELECT COUNT(*) FROM doctors d WHERE d.tenant_id = t.id)::int AS total_doctors
    FROM tenants t
    ORDER BY metric_value DESC
    LIMIT $1
  `, [limit]);
  return result.rows;
};

export const getRevenueAnalytics = async (months: number = 12): Promise<Record<string, unknown>[]> => {
  const result = await pool.query(`
    SELECT
      TO_CHAR(paid_at, 'YYYY-MM') AS month,
      COUNT(*)::int AS invoices,
      SUM(amount)::numeric AS revenue
    FROM subscription_invoices
    WHERE status = 'paid' AND paid_at >= NOW() - INTERVAL '1 month' * $1
    GROUP BY TO_CHAR(paid_at, 'YYYY-MM')
    ORDER BY month
  `, [months]);
  return result.rows;
};

export const getGrowthMetrics = async (months: number = 12): Promise<Record<string, unknown>[]> => {
  const result = await pool.query(`
    SELECT
      m.month,
      COALESCE(t.new_tenants, 0)::int AS new_tenants,
      COALESCE(u.new_users, 0)::int AS new_users,
      COALESCE(b.new_bookings, 0)::int AS new_bookings
    FROM (
      SELECT TO_CHAR(generate_series(NOW() - INTERVAL '1 month' * $1, NOW(), '1 month'), 'YYYY-MM') AS month
    ) m
    LEFT JOIN (
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS new_tenants
      FROM tenants WHERE created_at >= NOW() - INTERVAL '1 month' * $1 GROUP BY 1
    ) t ON t.month = m.month
    LEFT JOIN (
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS new_users
      FROM users WHERE created_at >= NOW() - INTERVAL '1 month' * $1 GROUP BY 1
    ) u ON u.month = m.month
    LEFT JOIN (
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS new_bookings
      FROM bookings WHERE created_at >= NOW() - INTERVAL '1 month' * $1 GROUP BY 1
    ) b ON b.month = m.month
    ORDER BY m.month
  `, [months]);
  return result.rows;
};

export const adminCreateTenant = async (data: {
  id: string;
  name: string;
  domain: string;
  locale?: string;
  timezone?: string;
  planCode?: string;
  adminEmail: string;
  adminPassword: string;
}): Promise<{ tenantId: string }> => {
  const { tenantService } = await import('../../shared/multi-tenant.service.js');
  const saasService = await import('../saas/saas.service.js');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO tenants (id, name, domain, locale, timezone, config, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [
        data.id,
        data.name,
        data.domain,
        data.locale || process.env.APP_LOCALE || 'es',
        data.timezone || 'America/Santiago',
        JSON.stringify({ company: data.name }),
      ]
    );

    if (data.planCode) {
      const plan = await saasService.getPlanByCode();
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      await client.query(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', $3, $4)`,
        [data.id, plan.id, now, periodEnd]
      );
    }

    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash(data.adminPassword, 12);

    await client.query(
      `INSERT INTO users (email, password, name, role, tenant_id, password_changed)
       VALUES ($1, $2, $3, 'admin', $4, true)`,
      [data.adminEmail, hash, `Admin ${data.name}`, data.id]
    );

    await client.query('COMMIT');

    await tenantService.loadFromDB();

    return { tenantId: data.id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
