import { pool } from './db.js';
import { logger } from '../utils/logger.js';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  locale: string;
  timezone: string;
  config: Record<string, unknown>;
  active: boolean;
}

let tenants = new Map<string, Tenant>();
let loadingLock: Promise<void> | null = null;

export const tenantService = {
  register(tenant: Tenant): void {
    tenants.set(tenant.id, tenant);
    tenants.set(tenant.domain, tenant);
  },

  getByDomain(domain: string): Tenant | undefined {
    return tenants.get(domain);
  },

  getById(id: string): Tenant | undefined {
    return tenants.get(id);
  },

  getAll(): Tenant[] {
    return Array.from(tenants.values()).filter((t, i, arr) =>
      arr.findIndex((x) => x.id === t.id) === i
    );
  },

  clear(): void {
    tenants = new Map();
  },

  async loadFromDB(): Promise<void> {
    if (loadingLock) return loadingLock;
    loadingLock = (async () => {
      try {
        const result = await pool.query<Tenant>(
          'SELECT id, name, domain, locale, timezone, config, active FROM tenants WHERE active = true'
        );
        const loaded = result.rows;
        const oldCount = tenantService.getAll().length;
        const newMap = new Map<string, Tenant>();
        for (const tenant of loaded) {
          newMap.set(tenant.id, tenant);
          newMap.set(tenant.domain, tenant);
        }
        tenants = newMap;
        logger.info(`Tenants loaded from DB: ${loaded.length} (was ${oldCount})`);
      } catch (error) {
        logger.error('Failed to load tenants from DB', { error: (error as Error).message });
      } finally {
        loadingLock = null;
      }
    })();
    return loadingLock;
  },
};

export const getTenantId = (req: { headers: Record<string, string | string[] | undefined>; tenant_id?: string }): string => {
  return req.tenant_id || process.env.DEFAULT_TENANT_ID || 'default';
};

export const loadTenantsFromDB = tenantService.loadFromDB.bind(tenantService);
