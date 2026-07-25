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
): Promise<{ data: Record<string, unknown>[]; total: number; page: number; limit: number; totalPages: number }> => {
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
        p.name AS plan_name, p.code AS plan_code,
        (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id)::int AS total_bookings,
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id)::int AS total_users,
        (SELECT COUNT(*) FROM doctors d WHERE d.tenant_id = t.id)::int AS total_doctors
     FROM tenants t
     LEFT JOIN LATERAL (
       SELECT s.plan_id FROM subscriptions s
       WHERE s.tenant_id = t.id AND s.status IN ('active', 'trialing')
       ORDER BY s.current_period_start DESC LIMIT 1
     ) sub ON true
     LEFT JOIN plans p ON p.id = sub.plan_id
     WHERE ${whereClause}
     ORDER BY t.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    params
  );

  const totalPages = Math.ceil(total / limit);

  return {
    data: result.rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      slug: r.id,
      domain: r.domain,
      active: r.active,
      plan: r.plan_code || r.plan_name || 'free',
      total_bookings: r.total_bookings,
      total_users: r.total_users,
      total_doctors: r.total_doctors,
      created_at: r.created_at,
    })),
    total,
    page,
    limit,
    totalPages,
  };
};

export const getTenantDetail = async (tenantId: string): Promise<Record<string, unknown>> => {
  const tenantResult = await pool.query<TenantRow>('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  if (tenantResult.rows.length === 0) throw new NotFoundError('Tenant not found');
  const tenant = tenantResult.rows[0];

  const statsResult = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role IN ('user', 'patient')) as total_patients,
      (SELECT COUNT(*) FROM doctors WHERE tenant_id = $1) as total_doctors,
      (SELECT COUNT(*) FROM users WHERE tenant_id = $1) as total_users,
      (SELECT COUNT(*) FROM bookings WHERE tenant_id = $1) as total_bookings,
      (SELECT COUNT(*) FROM bookings WHERE tenant_id = $1 AND status != 'cancelled') as confirmed_bookings,
      (SELECT COUNT(*) FROM invoices WHERE tenant_id = $1) as invoice_count,
      (SELECT COUNT(*) FROM lab_requests WHERE tenant_id = $1) as lab_request_count
  `, [tenantId]);

  const subResult = await pool.query(
    `SELECT p.name AS plan_name, p.code AS plan_code
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.tenant_id = $1 AND s.status IN ('active', 'trialing')
     ORDER BY s.current_period_start DESC LIMIT 1`,
    [tenantId]
  );

  const planCode = subResult.rows[0]?.plan_code || 'free';
  const planName = subResult.rows[0]?.plan_name || 'Gratuito';
  const stats = statsResult.rows[0] || {};

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.id,
    domain: tenant.domain,
    active: tenant.active,
    plan: planCode,
    plan_name: planName,
    locale: tenant.locale,
    timezone: tenant.timezone,
    total_patients: Number(stats.total_patients || 0),
    total_doctors: Number(stats.total_doctors || 0),
    total_users: Number(stats.total_users || 0),
    total_bookings: Number(stats.total_bookings || 0),
    confirmed_bookings: Number(stats.confirmed_bookings || 0),
    invoice_count: Number(stats.invoice_count || 0),
    lab_request_count: Number(stats.lab_request_count || 0),
    created_at: tenant.created_at,
  };
};

const ALLOWED_TENANT_FIELDS = new Set(['name', 'domain', 'locale', 'timezone', 'active', 'config']);

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
      (SELECT COUNT(*) FROM tenants WHERE created_at >= DATE_TRUNC('month', NOW()))::int AS new_tenants_this_month,
      (SELECT COUNT(*) FROM tenants WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new_tenants_30d,
      (SELECT COUNT(*) FROM users)::int AS total_users,
      (SELECT COUNT(*) FILTER (WHERE role = 'admin') FROM users)::int AS admin_users,
      (SELECT COUNT(*) FILTER (WHERE role IN ('user', 'patient')) FROM users)::int AS patient_users,
      (SELECT COUNT(*) FROM doctors)::int AS total_doctors,
      (SELECT COUNT(*) FROM bookings)::int AS total_bookings,
      (SELECT COUNT(*) FILTER (WHERE status = 'confirmed' OR confirmed = true) FROM bookings)::int AS confirmed_bookings,
      (SELECT COUNT(*) FILTER (WHERE status = 'cancelled') FROM bookings)::int AS cancelled_bookings,
      (SELECT COALESCE(SUM(amount), 0) FROM subscription_invoices WHERE status = 'paid')::numeric AS total_revenue,
      (SELECT COALESCE(SUM(amount), 0) FROM subscription_invoices WHERE status = 'paid' AND paid_at >= NOW() - INTERVAL '30 days')::numeric AS mrr,
      (SELECT COUNT(DISTINCT COALESCE(user_id::text, guest_rut)) FROM bookings WHERE date >= NOW() - INTERVAL '90 days')::int AS active_patients,
      (SELECT COUNT(*) FILTER (WHERE status IN ('active', 'trialing')) FROM subscriptions)::int AS active_subscriptions,
      (SELECT COUNT(*) FILTER (WHERE status = 'canceled') FROM subscriptions)::int AS canceled_subscriptions,
      (SELECT COUNT(*) FILTER (WHERE status = 'trialing') FROM subscriptions)::int AS trialing_subscriptions,
      ROUND(
        (SELECT COUNT(*) FILTER (WHERE status = 'cancelled') FROM bookings WHERE created_at >= NOW() - INTERVAL '30 days')::numeric /
        NULLIF((SELECT COUNT(*) FROM bookings WHERE created_at >= NOW() - INTERVAL '30 days'), 0) * 100, 1
      ) AS cancellation_rate_30d,
      ROUND(
        (SELECT COUNT(*) FILTER (WHERE status = 'canceled') FROM subscriptions WHERE canceled_at >= NOW() - INTERVAL '30 days')::numeric /
        NULLIF((SELECT COUNT(*) FILTER (WHERE status IN ('active', 'trialing')) FROM subscriptions), 0) * 100, 1
      ) AS churn_rate_30d
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

export const getTenantGrowthMetrics = async (tenantId: string, months: number = 12): Promise<Record<string, unknown>[]> => {
  const result = await pool.query(`
    SELECT
      m.month,
      COALESCE(u.new_users, 0)::int AS new_users,
      COALESCE(b.new_bookings, 0)::int AS new_bookings,
      COALESCE(cr.new_records, 0)::int AS new_clinical_records,
      COALESCE(lr.new_requests, 0)::int AS new_lab_requests
    FROM (
      SELECT TO_CHAR(generate_series(NOW() - INTERVAL '1 month' * $1, NOW(), '1 month'), 'YYYY-MM') AS month
    ) m
    LEFT JOIN (
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS new_users
      FROM users WHERE tenant_id = $2 AND created_at >= NOW() - INTERVAL '1 month' * $1 GROUP BY 1
    ) u ON u.month = m.month
    LEFT JOIN (
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS new_bookings
      FROM bookings WHERE tenant_id = $2 AND created_at >= NOW() - INTERVAL '1 month' * $1 GROUP BY 1
    ) b ON b.month = m.month
    LEFT JOIN (
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS new_records
      FROM clinical_records WHERE tenant_id = $2 AND created_at >= NOW() - INTERVAL '1 month' * $1 GROUP BY 1
    ) cr ON cr.month = m.month
    LEFT JOIN (
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS new_requests
      FROM lab_requests WHERE tenant_id = $2 AND created_at >= NOW() - INTERVAL '1 month' * $1 GROUP BY 1
    ) lr ON lr.month = m.month
    ORDER BY m.month
  `, [months, tenantId]);
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

export const getTenantHealthScores = async (): Promise<Record<string, unknown>[]> => {
  const result = await pool.query(`
    WITH tenant_activity AS (
      SELECT
        t.id, t.name, t.active, t.created_at,
        MAX(b.created_at) AS last_booking,
        COUNT(b.id) FILTER (WHERE b.created_at >= NOW() - INTERVAL '30 days') AS bookings_30d,
        COUNT(b.id) FILTER (WHERE b.created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days') AS bookings_prev_30d,
        COUNT(DISTINCT b.user_id) FILTER (WHERE b.created_at >= NOW() - INTERVAL '30 days') AS unique_patients_30d,
        COUNT(b.id) FILTER (WHERE b.status = 'cancelled' AND b.created_at >= NOW() - INTERVAL '30 days') AS cancellations_30d,
        COALESCE(
          (SELECT COUNT(*) FROM clinical_records cr WHERE cr.tenant_id = t.id LIMIT 1), 0
        ) + COALESCE(
          (SELECT COUNT(*) FROM lab_requests lr WHERE lr.tenant_id = t.id LIMIT 1), 0
        ) + COALESCE(
          (SELECT COUNT(*) FROM bookings bk WHERE bk.tenant_id = t.id LIMIT 1), 0
        ) + COALESCE(
          (SELECT COUNT(*) FROM invoices i WHERE i.tenant_id = t.id LIMIT 1), 0
        ) AS modules_used
      FROM tenants t
      LEFT JOIN bookings b ON b.tenant_id = t.id
      GROUP BY t.id, t.name, t.active, t.created_at
    ),
    extended AS (
      SELECT *,
        GREATEST(0, 20 - COALESCE(EXTRACT(DAY FROM NOW() - last_booking)::int, 999)) AS score_activity,
        CASE
          WHEN COALESCE(bookings_prev_30d, 0) = 0 THEN GREATEST(0, 20 - COALESCE(EXTRACT(DAY FROM NOW() - last_booking)::int, 999) / 2)
          ELSE GREATEST(0, ROUND((20 * LEAST(1.0, bookings_30d::numeric / NULLIF(bookings_prev_30d, 0)))::numeric, 1))
        END AS score_trend,
        LEAST(20, COALESCE(unique_patients_30d, 0) * 4) AS score_patients,
        CASE
          WHEN COALESCE(bookings_30d, 0) = 0 THEN 20
          ELSE ROUND((20 * GREATEST(0, 1 - (COALESCE(cancellations_30d, 0)::numeric / NULLIF(bookings_30d, 0) / 0.3)))::numeric, 1)
        END AS score_cancellation,
        LEAST(20, modules_used * 5) AS score_modules
      FROM tenant_activity
    )
    SELECT *,
      score_activity + score_trend + score_patients + score_cancellation + score_modules AS health_total
    FROM extended
    ORDER BY health_total ASC
  `);
  const rows = result.rows.map((r: Record<string, unknown>) => {
    const healthScore = Math.round(
      Number(r.score_activity || 0) +
      Number(r.score_trend || 0) +
      Number(r.score_patients || 0) +
      Number(r.score_cancellation || 0) +
      Number(r.score_modules || 0)
    );
    return { ...r, health_score: healthScore };
  });
  return rows;
};

export const getTenantHealthDetail = async (tenantId: string): Promise<Record<string, unknown>> => {
  const all = await getTenantHealthScores();
  const tenant = all.find((r: Record<string, unknown>) => r.id === tenantId);
  if (!tenant) throw new NotFoundError('Tenant not found');
  return tenant;
};

export const getOperationMetrics = async (months: number = 6): Promise<Record<string, unknown>> => {
  const specialtiesResult = await pool.query(`
    SELECT s.name, COUNT(b.id)::int AS total
    FROM specialties s
    JOIN doctors d ON d.specialty = s.name
    JOIN bookings b ON b.doctor_id = d.id AND b.date >= NOW() - INTERVAL '1 month' * $1 AND b.status != 'cancelled'
    GROUP BY s.name
    ORDER BY total DESC
  `, [months]);

  const cancellationRate = await pool.query(`
    SELECT
      ROUND(
        (COUNT(*) FILTER (WHERE status = 'cancelled')::numeric /
        NULLIF(COUNT(*), 0)) * 100, 1
      ) AS cancellation_rate,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS total_cancelled,
      COUNT(*)::int AS total_bookings_period
    FROM bookings
    WHERE date >= NOW() - INTERVAL '1 month' * $1
  `, [months]);

  const noShowResult = await pool.query(`
    SELECT
      ROUND(
        (COUNT(*) FILTER (WHERE b.status = 'confirmed' AND cr.id IS NULL)::numeric /
        NULLIF(COUNT(*) FILTER (WHERE b.status = 'confirmed'), 0)) * 100, 1
      ) AS no_show_rate
    FROM bookings b
    LEFT JOIN clinical_records cr ON cr.booking_id = b.id
    WHERE b.date >= NOW() - INTERVAL '1 month' * $1 AND b.date <= CURRENT_DATE
  `, [months]);

  const avgLeadTime = await pool.query(`
    SELECT
      ROUND(AVG(EXTRACT(DAY FROM (b.date + b.time) - b.created_at))::numeric, 1) AS avg_lead_days
    FROM bookings b
    WHERE b.created_at >= NOW() - INTERVAL '1 month' * $1
  `, [months]);

  const topDoctors = await pool.query(`
    SELECT d.name, COUNT(b.id)::int AS total_bookings,
      ROW_NUMBER() OVER (ORDER BY COUNT(b.id) DESC) AS rank
    FROM doctors d
    JOIN bookings b ON b.doctor_id = d.id AND b.date >= NOW() - INTERVAL '1 month' * $1 AND b.status != 'cancelled'
    GROUP BY d.id, d.name
    ORDER BY total_bookings DESC
    LIMIT 10
  `, [months]);

  const hourlyDemand = await pool.query(`
    SELECT EXTRACT(DOW FROM date)::int AS day_of_week, EXTRACT(HOUR FROM time)::int AS hour, COUNT(*)::int AS bookings
    FROM bookings
    WHERE date >= NOW() - INTERVAL '1 month' * $1 AND status != 'cancelled'
    GROUP BY day_of_week, hour
    ORDER BY day_of_week, hour
  `, [months]);

  return {
    specialties: specialtiesResult.rows,
    cancellation_rate: cancellationRate.rows[0]?.cancellation_rate || 0,
    total_cancelled: cancellationRate.rows[0]?.total_cancelled || 0,
    total_bookings_period: cancellationRate.rows[0]?.total_bookings_period || 0,
    no_show_rate: noShowResult.rows[0]?.no_show_rate || 0,
    avg_lead_days: avgLeadTime.rows[0]?.avg_lead_days || 0,
    top_doctors: topDoctors.rows,
    hourly_demand: hourlyDemand.rows,
  };
};

export const getChurnMetrics = async (months: number = 12): Promise<Record<string, unknown>> => {
  const result = await pool.query(`
    WITH months AS (
      SELECT TO_CHAR(generate_series(NOW() - INTERVAL '1 month' * $1, NOW(), '1 month'), 'YYYY-MM') AS month
    ),
      cancellations AS (
        SELECT TO_CHAR(canceled_at, 'YYYY-MM') AS month, COUNT(*)::int AS canceled_count
        FROM subscriptions
        WHERE canceled_at >= NOW() - INTERVAL '1 month' * $1 AND status = 'canceled'
        GROUP BY 1
      ),
      active_starts AS (
        SELECT TO_CHAR(current_period_start, 'YYYY-MM') AS month, COUNT(*)::int AS active_count
        FROM subscriptions
        WHERE current_period_start >= NOW() - INTERVAL '1 month' * $1 AND status IN ('active', 'trialing')
        GROUP BY 1
      )
    SELECT
      m.month,
      COALESCE(c.canceled_count, 0)::int AS canceled,
      COALESCE(a.active_count, 0)::int AS new_active,
      (SELECT COUNT(*) FROM subscriptions WHERE status IN ('active', 'trialing') AND current_period_start <= (m.month || '-01')::timestamp without time zone)::int AS total_active
    FROM months m
    LEFT JOIN cancellations c ON c.month = m.month
    LEFT JOIN active_starts a ON a.month = m.month
    ORDER BY m.month
  `, [months]);

  const rows = result.rows;
  const lastMonth = rows[rows.length - 1];
  const prevMonth = rows[rows.length - 2];

  const churnRate = lastMonth && lastMonth.total_active > 0
    ? Math.round((lastMonth.canceled / lastMonth.total_active) * 100 * 10) / 10
    : 0;
  const retentionRate = Math.round((1 - (churnRate / 100)) * 100 * 10) / 10;
  const annualRetention = Math.round(Math.pow(retentionRate / 100, 12) * 100 * 10) / 10;

  const mrrResult = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) AS mrr
    FROM subscription_invoices
    WHERE status = 'paid' AND paid_at >= NOW() - INTERVAL '30 days'
  `);
  const mrr = Number(mrrResult.rows[0]?.mrr || 0);

  return {
    churn_rate: churnRate,
    retention_rate: retentionRate,
    annual_retention: annualRetention,
    arr: Math.round(mrr * 12),
    mrr,
    monthly_breakdown: rows,
  };
};

export const getComparisonTable = async (): Promise<Record<string, unknown>[]> => {
  const result = await pool.query(`
    SELECT
      t.id, t.name, t.active, t.created_at,
      p.name AS plan_name, p.code AS plan_code,
      (SELECT COUNT(*) FROM doctors d WHERE d.tenant_id = t.id)::int AS total_doctors,
      (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.role IN ('user', 'patient'))::int AS total_patients,
      (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id)::int AS total_bookings,
      (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id AND b.date >= NOW() - INTERVAL '30 days')::int AS bookings_30d,
      (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id AND b.status = 'cancelled')::int AS total_cancelled,
      (SELECT COALESCE(SUM(amount), 0) FROM subscription_invoices si WHERE si.tenant_id = t.id AND si.status = 'paid')::numeric AS total_revenue,
      (SELECT MAX(b.created_at) FROM bookings b WHERE b.tenant_id = t.id) AS last_booking_date
    FROM tenants t
    LEFT JOIN LATERAL (
      SELECT s.plan_id FROM subscriptions s
      WHERE s.tenant_id = t.id AND s.status IN ('active', 'trialing')
      ORDER BY s.current_period_start DESC LIMIT 1
    ) sub ON true
    LEFT JOIN plans p ON p.id = sub.plan_id
    ORDER BY t.created_at DESC
  `);

  const healthScores = await getTenantHealthScores();
  const healthMap = new Map(healthScores.map((h: Record<string, unknown>) => [h.id, h]));

  return result.rows.map((r: Record<string, unknown>) => {
    const health = healthMap.get(r.id as string) || {};
    return { ...r, health_score: health.health_score || 0 };
  });
};

export const getOccupancyMetrics = async (): Promise<Record<string, unknown>[]> => {
  const result = await pool.query(`
    SELECT
      t.id, t.name,
      COUNT(DISTINCT da.id)::int AS total_slots,
      COUNT(DISTINCT b.id) FILTER (WHERE b.date >= NOW() - INTERVAL '30 days' AND b.status != 'cancelled')::int AS recent_bookings,
      CASE
        WHEN COUNT(DISTINCT da.id) > 0
        THEN ROUND((COUNT(DISTINCT b.id)::numeric / NULLIF(COUNT(DISTINCT da.id), 0)) * 100, 1)
        ELSE 0
      END AS occupancy_pct
    FROM tenants t
    LEFT JOIN doctors d ON d.tenant_id = t.id
    LEFT JOIN doctor_availability da ON da.doctor_id = d.id
    LEFT JOIN bookings b ON b.doctor_id = d.id AND b.date >= NOW() - INTERVAL '30 days' AND b.date <= CURRENT_DATE AND b.status != 'cancelled'
    GROUP BY t.id, t.name
    ORDER BY occupancy_pct DESC
  `);
  return result.rows;
};

export const getActivityMetrics = async (): Promise<Record<string, unknown>[]> => {
  const result = await pool.query(`
    SELECT
      t.id, t.name, t.active,
      MAX(b.created_at) AS last_booking,
      (SELECT MAX(last_activity_at) FROM users WHERE tenant_id = t.id AND role = 'admin') AS last_admin_activity,
      (SELECT COUNT(*) FROM bookings WHERE tenant_id = t.id AND created_at >= NOW() - INTERVAL '7 days')::int AS bookings_7d,
      (SELECT COUNT(*) FILTER (WHERE role = 'admin' AND last_activity_at >= NOW() - INTERVAL '30 days') FROM users WHERE tenant_id = t.id)::int AS admin_active_30d
    FROM tenants t
    LEFT JOIN bookings b ON b.tenant_id = t.id
    GROUP BY t.id, t.name, t.active
    ORDER BY GREATEST(
      COALESCE(MAX(b.created_at), '1970-01-01'::timestamp),
      COALESCE((SELECT MAX(last_activity_at) FROM users WHERE tenant_id = t.id AND role = 'admin'), '1970-01-01'::timestamp)
    ) ASC
  `);
  return result.rows;
};

export const getAlerts = async (): Promise<Record<string, unknown>[]> => {
  const healthScores = await getTenantHealthScores();
  const activity = await getActivityMetrics();
  const activityMap = new Map(activity.map((a: Record<string, unknown>) => [a.id, a]));

  const alerts: Record<string, unknown>[] = [];

  for (const tenant of healthScores) {
    const act = activityMap.get(tenant.id as string) as Record<string, unknown> | undefined;
    const score = Number(tenant.health_score || 0);
    const daysSinceBooking = act?.last_booking
      ? Math.floor((Date.now() - new Date(act.last_booking as string).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const bookings7d = Number(act?.bookings_7d || 0);
    const bookings30d = Number(tenant.bookings_30d || 0);
    const bookingsPrev30d = Number(tenant.bookings_prev_30d || 0);
    const uniquePatients30d = Number(tenant.unique_patients_30d || 0);
    const cancellations30d = Number(tenant.cancellations_30d || 0);

    // Crítica: Tenant sin actividad 7+ días
    if (daysSinceBooking >= 7 && tenant.active) {
      alerts.push({
        tenant_id: tenant.id, tenant_name: tenant.name,
        type: 'inactivity', severity: daysSinceBooking >= 14 ? 'critical' : 'high',
        message: `${daysSinceBooking} días sin actividad`,
      });
    }

    // Alta: Caída > 30% en bookings
    if (bookingsPrev30d > 0 && bookings30d < bookingsPrev30d * 0.7) {
      const drop = Math.round((1 - bookings30d / bookingsPrev30d) * 100);
      alerts.push({
        tenant_id: tenant.id, tenant_name: tenant.name,
        type: 'drop_activity', severity: 'high',
        message: `Caída del ${drop}% en citas vs mes anterior`,
      });
    }

    // Media: Sin nuevos pacientes 21+ días
    if (uniquePatients30d === 0 && bookingsPrev30d > 0) {
      alerts.push({
        tenant_id: tenant.id, tenant_name: tenant.name,
        type: 'no_new_patients', severity: 'medium',
        message: 'Sin nuevos pacientes en 30 días',
      });
    }

    // Media: Cancelaciones anómalas
    if (bookings30d > 5 && cancellations30d > 0 && (cancellations30d / bookings30d) > 0.25) {
      const rate = Math.round((cancellations30d / bookings30d) * 100);
      alerts.push({
        tenant_id: tenant.id, tenant_name: tenant.name,
        type: 'high_cancellations', severity: 'medium',
        message: `Tasa de cancelación del ${rate}%`,
      });
    }

    // Alta: Posible abandono (30+ días sin booking)
    if (daysSinceBooking >= 30 && tenant.active) {
      alerts.push({
        tenant_id: tenant.id, tenant_name: tenant.name,
        type: 'possible_churn', severity: 'high',
        message: 'Posible abandono — 30+ días sin actividad',
      });
    }
  }

  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  alerts.sort((a, b) => (severityOrder[a.severity as string] || 99) - (severityOrder[b.severity as string] || 99));

  return alerts;
};

export const adminCreateTenant = async (data: {
  id?: string;
  name: string;
  slug?: string;
  domain?: string;
  plan?: string;
  planCode?: string;
  locale?: string;
  timezone?: string;
  adminEmail?: string;
  adminPassword?: string;
}): Promise<{ tenantId: string }> => {
  const { tenantService } = await import('../../shared/multi-tenant.service.js');
  const saasService = await import('../saas/saas.service.js');

  const tenantId = data.id || data.slug || data.name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const domain = data.domain || `${tenantId}.clinic.app`;
  const adminEmail = data.adminEmail || `admin@${tenantId}.clinic.app`;
  const adminPassword = data.adminPassword || 'Admin123!@#';
  const planCode = data.planCode || data.plan || 'free';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO tenants (id, name, domain, locale, timezone, config, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (id) DO UPDATE SET name = $2, domain = $3`,
      [
        tenantId,
        data.name,
        domain,
        data.locale || process.env.APP_LOCALE || 'es',
        data.timezone || 'America/Santiago',
        JSON.stringify({ company: data.name }),
      ]
    );

    if (planCode) {
      const plan = await saasService.getPlanByCode(planCode);
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      await client.query(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', $3, $4)`,
        [tenantId, plan.id, now, periodEnd]
      );
    }

    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash(adminPassword, 12);

    await client.query(
      `INSERT INTO users (email, password, name, role, tenant_id, password_changed)
       VALUES ($1, $2, $3, 'admin', $4, true)
       ON CONFLICT (tenant_id, email) DO NOTHING`,
      [adminEmail, hash, `Admin ${data.name}`, tenantId]
    );

    await client.query('COMMIT');

    await tenantService.loadFromDB();

    return { tenantId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
