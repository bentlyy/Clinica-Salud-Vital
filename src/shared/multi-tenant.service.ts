export interface Tenant {
  id: string;
  name: string;
  domain: string;
  locale: string;
  timezone: string;
  config: Record<string, unknown>;
}

const tenants = new Map<string, Tenant>();

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
    tenants.clear();
  },
};

export const extractTenantFromHost = (host: string): string | null => {
  if (!host) return null;
  const parts = host.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
};
