export const withTenant = (query: string, params: unknown[], tenantId?: string): [string, unknown[]] => {
  if (!tenantId) return [query, params];
  const paramIdx = params.length + 1;
  const whereIndex = query.toUpperCase().lastIndexOf('WHERE');
  if (whereIndex === -1) {
    return [`${query} WHERE tenant_id = $${paramIdx}`, [...params, tenantId]];
  }
  const insertAt = whereIndex + 5;
  return [
    query.slice(0, insertAt) + ` tenant_id = $${paramIdx} AND` + query.slice(insertAt),
    [...params, tenantId]
  ];
};

export const buildTenantParam = (index: number, tenantId?: string): string => {
  if (!tenantId) return '';
  return ` AND tenant_id = $${index}`;
};

export const addTenantParam = (params: unknown[], tenantId?: string): unknown[] => {
  if (!tenantId) return params;
  return [...params, tenantId];
};

export const assertTenantId = (tenantId?: string): string => {
  if (!tenantId) throw new Error('tenant_id is required');
  return tenantId;
};
