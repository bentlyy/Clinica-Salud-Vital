import { pool } from './db.js';
import { logger } from '../utils/logger.js';

export interface SafeQueryOptions {
  tenantId?: string;
  bypass?: boolean;
}

const ALLOWED_WITHOUT_TENANT = new Set([
  'INSERT INTO tenants',
  'INSERT INTO _migrations',
  'INSERT INTO _schema_meta',
  'INSERT INTO _rls_audit',
  'SELECT * FROM tenants',
  'SELECT FROM tenants',
  'SELECT 1',
  'SELECT NOW()',
  'SELECT version()',
]);

function isAllowedWithoutTenant(sql: string): boolean {
  const normalized = sql.trim().replace(/\s+/g, ' ');
  for (const allowed of ALLOWED_WITHOUT_TENANT) {
    if (normalized.startsWith(allowed)) return true;
  }
  return false;
}

function extractOperation(sql: string): string {
  const trimmed = sql.trim().toUpperCase();
  if (trimmed.startsWith('SELECT')) return 'SELECT';
  if (trimmed.startsWith('INSERT')) return 'INSERT';
  if (trimmed.startsWith('UPDATE')) return 'UPDATE';
  if (trimmed.startsWith('DELETE')) return 'DELETE';
  if (trimmed.startsWith('WITH')) return 'WITH';
  return 'OTHER';
}

function hasWhereClause(sql: string): boolean {
  const normalized = sql.toUpperCase().replace(/'[^']*'/g, ''); // remove string literals
  // Check for WHERE after removing subqueries in parentheses (simple approach)
  const mainQuery = normalized.split(')').pop() || normalized;
  return mainQuery.includes('WHERE');
}

export function validateTenantIsolation(
  sql: string,
  params: unknown[],
  options: SafeQueryOptions
): void {
  if (options.bypass) return;
  if (isAllowedWithoutTenant(sql)) return;

  const operation = extractOperation(sql);

  // Skip validation for INSERT (trigger handles it)
  if (operation === 'INSERT') return;
  if (operation === 'OTHER') return;

  // For SELECT, UPDATE, DELETE — MUST have tenant_id in params if no WHERE
  const tenantId = options.tenantId;
  if (!tenantId || tenantId === 'default') {
    // Check if the query explicitly references tenant_id
    if (!sql.toLowerCase().includes('tenant_id')) {
      logger.error(`TENANT ISOLATION VIOLATION: Query without tenant_id reference`, {
        sql: sql.substring(0, 200),
        operation,
      });

      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          `CRITICAL: Tenant isolation violation. Query must reference tenant_id.\n` +
          `Operation: ${operation}\n` +
          `SQL: ${sql.substring(0, 300)}`
        );
      }
    }
  }
}

export async function tenantQuery<T = any>(
  sql: string,
  params: unknown[] = [],
  options: SafeQueryOptions = {}
): Promise<{ rows: T[]; rowCount: number }> {
  validateTenantIsolation(sql, params, options);
  return pool.query(sql, params);
}

export async function tenantQueryWithClient<T = any>(
  client: any,
  sql: string,
  params: unknown[] = [],
  options: SafeQueryOptions = {}
): Promise<{ rows: T[]; rowCount: number }> {
  validateTenantIsolation(sql, params, options);
  return client.query(sql, params);
}

export function assertTenantId(tenantId?: string): string {
  if (!tenantId || tenantId === 'default') {
    throw new Error('CRITICAL: tenant_id is required but was not provided');
  }
  return tenantId;
}

export function buildWhereTenant(paramIndex: number, tenantId: string): string {
  return ` AND tenant_id = $${paramIndex}`;
}

export function addTenantParam(params: unknown[], tenantId: string): unknown[] {
  return [...params, tenantId];
}
