import { describe, it, expect } from 'vitest';
import {
  getRedirectPath,
  normalizeRole,
  hasPermission,
  getRoleLabel,
  getRoleColor,
} from '@/shared/utils/role.utils';

describe('getRedirectPath', () => {
  it('maps each role to its home route', () => {
    expect(getRedirectPath('superadmin')).toBe('/saas');
    expect(getRedirectPath('admin')).toBe('/dashboard');
    expect(getRedirectPath('doctor')).toBe('/dashboard');
    expect(getRedirectPath('lab_technician')).toBe('/laboratory');
    expect(getRedirectPath('patient')).toBe('/dashboard');
    expect(getRedirectPath('user')).toBe('/dashboard');
  });

  it('falls back to /dashboard for unknown roles', () => {
    expect(getRedirectPath('guest' as never)).toBe('/dashboard');
  });
});

describe('normalizeRole', () => {
  it('maps the user role to patient', () => {
    expect(normalizeRole('user')).toBe('patient');
  });

  it('keeps other roles unchanged', () => {
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('superadmin')).toBe('superadmin');
    expect(normalizeRole('lab_technician')).toBe('lab_technician');
    expect(normalizeRole('patient')).toBe('patient');
  });
});

describe('hasPermission', () => {
  it('returns true for boolean module permissions', () => {
    expect(hasPermission('superadmin', 'dashboard')).toBe(true);
    expect(hasPermission('admin', 'dashboard')).toBe(true);
    expect(hasPermission('patient', 'dashboard')).toBe(true);
  });

  it('checks action-level permissions', () => {
    expect(hasPermission('admin', 'users', 'edit')).toBe(true);
    expect(hasPermission('admin', 'users', 'delete')).toBe(false);
    expect(hasPermission('doctor', 'laboratory', 'validate')).toBe(true);
    expect(hasPermission('doctor', 'laboratory', 'create')).toBe(false);
  });

  it('returns false when an action is required but not provided', () => {
    expect(hasPermission('admin', 'users')).toBe(false);
    expect(hasPermission('doctor', 'laboratory')).toBe(false);
  });

  it('returns false for modules the role cannot access', () => {
    expect(hasPermission('patient', 'audit')).toBe(false);
    expect(hasPermission('guest', 'dashboard')).toBe(false);
    expect(hasPermission('lab_technician', 'clinicalRecords')).toBe(false);
  });

  it('respects the permissions defined for the user role', () => {
    expect(hasPermission('user', 'dashboard')).toBe(true);
    expect(hasPermission('user', 'bookings', 'create')).toBe(false);
    expect(hasPermission('user', 'settings', 'edit')).toBe(true);
  });

  it('returns false for unknown roles', () => {
    expect(hasPermission('unknown' as never, 'dashboard')).toBe(false);
  });
});

describe('getRoleLabel', () => {
  const esDict: Record<string, string> = {
    'common:roles.superadmin': 'Super Admin',
    'common:roles.admin': 'Administrador',
    'common:roles.doctor': 'Doctor',
    'common:roles.lab_technician': 'Técnico de Laboratorio',
    'common:roles.patient': 'Paciente',
    'common:roles.guest': 'Invitado',
    'common:roles.user': 'Usuario',
  };
  const t = (key: string) => esDict[key] ?? key;

  it('returns a human-readable label for each role', () => {
    expect(getRoleLabel('superadmin', t)).toBe('Super Admin');
    expect(getRoleLabel('admin', t)).toBe('Administrador');
    expect(getRoleLabel('doctor', t)).toBe('Doctor');
    expect(getRoleLabel('lab_technician', t)).toBe('Técnico de Laboratorio');
    expect(getRoleLabel('patient', t)).toBe('Paciente');
    expect(getRoleLabel('guest', t)).toBe('Invitado');
    expect(getRoleLabel('user', t)).toBe('Usuario');
  });

  it('falls back to the raw role for unknown roles', () => {
    expect(getRoleLabel('mystery' as never, t)).toBe('mystery');
  });
});

describe('getRoleColor', () => {
  it('returns a color for each role', () => {
    expect(getRoleColor('superadmin')).toBe('#7c3aed');
    expect(getRoleColor('admin')).toBe('#0d9488');
    expect(getRoleColor('doctor')).toBe('#2563eb');
    expect(getRoleColor('lab_technician')).toBe('#d97706');
    expect(getRoleColor('patient')).toBe('#059669');
    expect(getRoleColor('guest')).toBe('#4b5563');
    expect(getRoleColor('user')).toBe('#4b5563');
  });

  it('falls back to a neutral color for unknown roles', () => {
    expect(getRoleColor('mystery' as never)).toBe('#4b5563');
  });
});
