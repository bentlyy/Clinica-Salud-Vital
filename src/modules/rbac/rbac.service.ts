import { pool } from '../../shared/db.js';

export const getUserPermissions = async (user_id: number, role: string): Promise<string[]> => {
  const rolePermissions = await pool.query(
    'SELECT p.name, p.resource, p.action FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role = $1',
    [role]
  );

  const userPermissions = await pool.query(
    'SELECT p.name, p.resource, p.action, up.granted FROM permissions p JOIN user_permissions up ON p.id = up.permission_id WHERE up.user_id = $1 AND (up.expires_at IS NULL OR up.expires_at > NOW())',
    [user_id]
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

export const hasPermission = async (user_id: number, role: string, requiredPermission: string): Promise<boolean> => {
  const permissions = await getUserPermissions(user_id, role);
  return permissions.includes(requiredPermission);
};

export const grantPermission = async (user_id: number, permission_id: number, expires_at?: Date): Promise<void> => {
  await pool.query(
    'INSERT INTO user_permissions (user_id, permission_id, granted, expires_at) VALUES ($1, $2, true, $3) ON CONFLICT (user_id, permission_id) DO UPDATE SET granted = true, expires_at = $3',
    [user_id, permission_id, expires_at || null]
  );
};

export const revokePermission = async (user_id: number, permission_id: number): Promise<void> => {
  await pool.query(
    'UPDATE user_permissions SET granted = false WHERE user_id = $1 AND permission_id = $2',
    [user_id, permission_id]
  );
};