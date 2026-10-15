import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

/**
 * Test de AISLAMIENTO multi-tenant contra PostgreSQL REAL (RLS activo).
 *
 * Por defecto se OMITE: solo corre cuando se define RLS_TEST_DATABASE_URL
 * (cadena de conexion con el rol de aplicacion, p.ej. clinic_user, que NO
 * tiene BYPASSRLS). Ejemplo:
 *
 *   $env:RLS_TEST_DATABASE_URL='postgresql://clinic_user:***@host:5432/clinicdb'
 *   $env:RLS_TEST_TENANTS='default,clinica-demo,clinica-norte,clinica-sur'
 *   npx vitest run tests/integration/rls-isolation.test.js
 *
 * Criterio "test que falla si el RLS se rompe": cualquier tabla con RLS que
 * empiece a exponer filas de otro tenant hace fallar la suite.
 */

const { Client } = pg;

const APP_URL = process.env.RLS_TEST_DATABASE_URL;
const TENANTS = (process.env.RLS_TEST_TENANTS || 'default')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Tablas globales / de infraestructura que NO son multi-tenant por diseno.
const GLOBAL_TABLES = new Set(['_migrations', 'cie10_catalog', 'jobs']);

// Deuda conocida restante. Las tablas SaaS/onboarding (subscriptions,
// subscription_invoices, tenant_features, tenant_usage, specialties,
// tenant_onboarding, onboarding_documents) ya no están aquí: las migraciones
// 035/036 (renumeradas desde 032/033 para no colisionar con producción en
// Render) las cerraron con tenant_isolation (patrón COALESCE compatible).
// Si vuelven a filtrar, el test FALLA (es el objetivo).
const KNOWN_LEAKING = new Set([]);

async function listTenantTables(client) {
  const { rows } = await client.query(`
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN information_schema.columns col
      ON col.table_name = c.relname AND col.table_schema = 'public' AND col.column_name = 'tenant_id'
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY 1
  `);
  return rows.map((r) => r.table_name).filter((t) => !GLOBAL_TABLES.has(t));
}

const suite = APP_URL ? describe : describe.skip;

suite('RLS isolation (PostgreSQL real)', () => {
  let client;
  let tenantTables = [];

  beforeAll(async () => {
    client = new Client({ connectionString: APP_URL });
    await client.connect();
    tenantTables = await listTenantTables(client);
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  describe.each(TENANTS)('tenant app.tenant_id = %s', (tenant) => {
    it('no expone filas de otros tenants en tablas protegidas', async () => {
      await client.query('SELECT set_config($1, $2, false)', ['app.tenant_id', tenant]);

      const leaks = [];
      for (const table of tenantTables) {
        const { rows } = await client.query(
          `SELECT count(*)::int AS n FROM "${table}"
           WHERE tenant_id IS NOT NULL AND tenant_id <> $1`,
          [tenant]
        );
        const n = rows[0].n;
        if (n > 0 && !KNOWN_LEAKING.has(table)) {
          leaks.push(`${table}=${n}`);
        }
      }

      expect(leaks, `fugas cross-tenant NO documentadas: ${leaks.join(', ')}`).toEqual([]);
    });
  });

  it('descubre al menos una tabla multi-tenant (sanity check de la BD)', () => {
    expect(tenantTables.length).toBeGreaterThan(0);
  });
});
