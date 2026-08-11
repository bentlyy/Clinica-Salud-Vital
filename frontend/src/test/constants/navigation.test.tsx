import { describe, it, expect } from 'vitest';
import { getNavItems } from '@/shared/constants/navigation';
import type { TFunction } from 'i18next';

const t = ((key: string) => `L:${key}`) as unknown as TFunction<'nav', undefined>;

describe('getNavItems', () => {
  it('returns admin items with translated labels and paths', () => {
    const items = getNavItems('admin', t);
    const paths = items.map((i) => i.path);
    expect(paths).toContain('/dashboard');
    expect(paths).toContain('/clinical');
    expect(paths).toContain('/management');
    expect(paths).toContain('/settings');
    expect(paths).not.toContain('/tenants');
    expect(paths).not.toContain('/users');
    expect(paths).not.toContain('/saas');
  });

  it('returns superadmin-only items for superadmin', () => {
    const items = getNavItems('superadmin', t);
    const paths = items.map((i) => i.path);
    expect(paths).toContain('/saas');
    expect(paths).toContain('/tenants');
    expect(paths).toContain('/users');
    expect(paths).toContain('/audit');
    expect(paths).toContain('/cobros');
  });

  it('returns laboratory items for lab_technician', () => {
    const items = getNavItems('lab_technician', t);
    const paths = items.map((i) => i.path);
    expect(paths).toContain('/laboratory');
    expect(paths).toContain('/analytics');
    expect(paths).toContain('/reports');
    expect(paths).not.toContain('/clinical');
  });

  it('treats the user role as patient', () => {
    const userItems = getNavItems('user', t);
    const patientItems = getNavItems('patient', t);
    expect(userItems.map((i) => i.path)).toEqual(patientItems.map((i) => i.path));
    expect(userItems.map((i) => i.path)).toContain('/bookings');
  });

  it('includes patient-specific routes for patients', () => {
    const items = getNavItems('patient', t);
    const paths = items.map((i) => i.path);
    expect(paths).toContain('/bookings');
    expect(paths).toContain('/clinical-records');
    expect(paths).toContain('/prescriptions');
    expect(paths).toContain('/medical-history');
    expect(paths).toContain('/my-laboratory');
  });

  it('translates labels and children and keeps featureKey', () => {
    const items = getNavItems('doctor', t);
    const laboratory = items.find((i) => i.path === '/laboratory');
    expect(laboratory).toBeDefined();
    expect(laboratory?.featureKey).toBe('laboratory');
    expect(laboratory?.label).toBe('L:laboratory');
    expect(laboratory?.children?.map((c) => c.path)).toEqual([
      '/laboratory',
      '/laboratory/requests',
      '/laboratory/catalog',
      '/laboratory/quality-control',
      '/laboratory/analytics',
      '/doctor/lab-results',
    ]);
    expect(laboratory?.children?.[0]?.label).toBe('L:labPanel');
  });

  it('does not include laboratory children for roles without the module', () => {
    const items = getNavItems('patient', t);
    expect(items.some((i) => i.path === '/laboratory')).toBe(false);
  });

  it('assigns an icon and roles to every item', () => {
    const items = getNavItems('admin', t);
    for (const item of items) {
      expect(item.icon).toBeDefined();
      expect(item.roles.length).toBeGreaterThan(0);
    }
  });
});
