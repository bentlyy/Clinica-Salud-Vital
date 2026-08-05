import { type JwtUser } from '@/shared/types/api.types';
import { ROLE_PERMISSIONS } from '@/shared/constants/permissions';

export function getRedirectPath(role: JwtUser['role']): string {
  switch (role) {
    case 'superadmin':
      return '/saas';
    case 'admin':
      return '/dashboard';
    case 'doctor':
      return '/dashboard';
    case 'lab_technician':
      return '/laboratory';
    case 'patient':
      return '/dashboard';
    default:
      return '/dashboard';
  }
}

export function hasPermission(role: JwtUser['role'], module: string, action?: string): boolean {
  const perms = ROLE_PERMISSIONS[role] as Record<string, unknown> | undefined;
  if (!perms) return false;

  const modulePerm = perms[module];
  if (modulePerm === true) return true;
  if (modulePerm === false || !modulePerm) return false;
  if (typeof modulePerm === 'object' && action) {
    return (modulePerm as Record<string, boolean>)[action] === true;
  }
  return false;
}

export function getRoleLabel(role: JwtUser['role']): string {
  const labels: Record<JwtUser['role'], string> = {
    superadmin: 'Super Admin',
    admin: 'Administrador',
    doctor: 'Doctor',
    lab_technician: 'Técnico de Laboratorio',
    patient: 'Paciente',
    guest: 'Invitado',
    user: 'Usuario',
  };
  return labels[role] || role;
}

export function getRoleColor(role: JwtUser['role']): string {
  const colors: Record<JwtUser['role'], string> = {
    superadmin: '#7c3aed',
    admin: '#0d9488',
    doctor: '#2563eb',
    lab_technician: '#d97706',
    patient: '#059669',
    guest: '#6b7280',
    user: '#6b7280',
  };
  return colors[role] || '#6b7280';
}
