import { pool } from '../../shared/db.js';

export const getUserPermissions = async (user_id, role) => {
  const rolePermissions = await pool.query(`
    SELECT p.name, p.resource, p.action
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    WHERE rp.role = $1
  `, [role]);

  const userPermissions = await pool.query(`
    SELECT p.name, p.resource, p.action, up.granted
    FROM permissions p
    JOIN user_permissions up ON p.id = up.permission_id
    WHERE up.user_id = $1 AND (up.expires_at IS NULL OR up.expires_at > NOW())
  `, [user_id]);

  const permissions = new Set();

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

export const hasPermission = async (user_id, role, requiredPermission) => {
  const permissions = await getUserPermissions(user_id, role);

  if (permissions.includes(requiredPermission)) {
    return true;
  }

  if (requiredPermission.includes(':all') && permissions.includes(requiredPermission.replace(':all', ':own'))) {
    return true;
  }

  if (requiredPermission.includes(':patient') && permissions.includes(requiredPermission.replace(':patient', ':own'))) {
    return true;
  }

  return false;
};

export const checkResourceOwnership = (user_id, role, resource, owner_id) => {
  if (role === 'admin') return true;
  if (role === 'doctor') {
    return true;
  }
  return user_id === owner_id;
};