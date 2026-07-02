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
let domainMap = new Map<string, string>();
let loadingLock: Promise<void> | null = null;
let lastLoaded = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

function isCacheStale(): boolean {
  return Date.now() - lastLoaded > CACHE_TTL_MS;
}

export const tenantService = {
  _domainMap: domainMap,

  register(tenant: Tenant): void {
    tenants.set(tenant.id, tenant);
    domainMap.set(tenant.domain, tenant.id);
  },

  getByDomain(domain: string): Tenant | undefined {
    if (isCacheStale()) this.loadFromDB().catch(() => {});
    const id = domainMap.get(domain);
    return id ? tenants.get(id) : undefined;
  },

  getById(id: string): Tenant | undefined {
    if (isCacheStale()) this.loadFromDB().catch(() => {});
    return tenants.get(id);
  },

  getAll(): Tenant[] {
    if (isCacheStale()) this.loadFromDB().catch(() => {});
    return Array.from(tenants.values());
  },

  clear(): void {
    tenants = new Map();
    domainMap = new Map();
    this._domainMap = domainMap;
    lastLoaded = 0;
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
        const idMap = new Map<string, Tenant>();
        const domainMap = new Map<string, string>();
        for (const tenant of loaded) {
          idMap.set(tenant.id, tenant);
          domainMap.set(tenant.domain, tenant.id);
        }
        tenants = idMap;
        tenantService._domainMap = domainMap;
        lastLoaded = Date.now();
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
  return req.tenant_id ?? process.env.DEFAULT_TENANT_ID ?? 'default';
};

export const loadTenantsFromDB = tenantService.loadFromDB.bind(tenantService);
