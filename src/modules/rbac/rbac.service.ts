import { pool } from '../../shared/db.js';

export const getUserPermissions = async (user_id: number, role: string, tenantId?: string): Promise<string[]> => {
  const rolePermissions = await pool.query(
    `SELECT p.name, p.resource, p.action FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role = $1${tenantId ? ' AND p.tenant_id = $2' : ''}`,
    tenantId ? [role, tenantId] : [role]
  );

  const userPermissions = await pool.query(
    `SELECT p.name, p.resource, p.action, up.granted FROM permissions p JOIN user_permissions up ON p.id = up.permission_id WHERE up.user_id = $1 AND (up.expires_at IS NULL OR up.expires_at > NOW())${tenantId ? ' AND p.tenant_id = $2' : ''}`,
    tenantId ? [user_id, tenantId] : [user_id]
  );

  const permissions = new Set<string>();

  for (const p of rolePermissions.rows) {
    permissions.add(`${p.resource}:${p.action}`);
  }

  for (const p of userPermissions.rows) {
    if (p.granted) {
      permissions.add(`${p.resource}:${p.action}`);
    } else {
      permissions.delete(`${p.resource}:${p.action}`);
    }
  }

  return Array.from(permissions);
};

export const hasPermission = async (user_id: number, role: string, requiredPermission: string, tenantId?: string): Promise<boolean> => {
  const permissions = await getUserPermissions(user_id, role, tenantId);
  return permissions.includes(requiredPermission);
};

export const grantPermission = async (user_id: number, permission_id: number, expires_at?: Date, tenantId?: string): Promise<void> => {
  const columns = ['user_id', 'permission_id', 'granted', 'expires_at'];
  const values: (string | number | Date | null | boolean)[] = [user_id, permission_id, true, expires_at || null];

  if (tenantId) {
    columns.push('tenant_id');
    values.push(tenantId);
  }

  await pool.query(
    `INSERT INTO user_permissions (${columns.join(', ')}) VALUES (${values.map((_, i) => '$' + (i + 1)).join(', ')}) ON CONFLICT (user_id, permission_id) DO UPDATE SET granted = true, expires_at = $4`,
    values
  );
};

export const revokePermission = async (user_id: number, permission_id: number): Promise<void> => {
  await pool.query(
    'UPDATE user_permissions SET granted = false WHERE user_id = $1 AND permission_id = $2',
    [user_id, permission_id]
  );
};