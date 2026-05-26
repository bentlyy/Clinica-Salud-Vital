import { pool } from '../../shared/db.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

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

  const result = await pool.query<TenantRow>(
    `SELECT t.* FROM tenants t WHERE ${whereClause}
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

export const updateTenant = async (
  tenantId: string,
  data: Partial<Pick<TenantRow, 'name' | 'locale' | 'timezone' | 'active' | 'config'>>
): Promise<TenantRow> => {
  const sets: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(data)) {
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
  } catch {
    // non-critical
  }

  return result.rows[0];
};

export const deleteTenant = async (tenantId: string): Promise<void> => {
  const result = await pool.query('DELETE FROM tenants WHERE id = $1 RETURNING id', [tenantId]);
  if (result.rows.length === 0) throw new NotFoundError('Tenant not found');
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
      const plan = await saasService.getPlanByCode(data.planCode);
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
