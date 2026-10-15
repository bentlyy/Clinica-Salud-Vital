import { describe, it, expect } from 'vitest';

import { userIdParamSchema as doctorUserIdParamSchema } from '../../src/modules/doctor/doctor.schema.js';
import {
  userIdParamSchema as adminUserIdParamSchema,
  toggleUserActiveSchema,
} from '../../src/modules/super-admin/super-admin.schema.js';
import { updateTenantConfigSchema } from '../../src/modules/saas/saas.schema.js';

describe('T1 — verificación de esquemas de endpoints antes sin validar', () => {
  describe('params userId', () => {
    it('coacciona el id de ruta a número', () => {
      expect(doctorUserIdParamSchema.parse({ userId: '7' })).toEqual({ userId: 7 });
      expect(adminUserIdParamSchema.parse({ userId: '42' })).toEqual({ userId: 42 });
    });

    it('rechaza ids no numéricos o no positivos', () => {
      expect(doctorUserIdParamSchema.safeParse({ userId: 'abc' }).success).toBe(false);
      expect(adminUserIdParamSchema.safeParse({ userId: '-1' }).success).toBe(false);
      expect(adminUserIdParamSchema.safeParse({ userId: '0' }).success).toBe(false);
    });
  });

  describe('super-admin toggleUserActiveSchema', () => {
    it('acepta body vacío (activar por defecto)', () => {
      expect(toggleUserActiveSchema.parse({})).toEqual({});
    });

    it('acepta active booleano', () => {
      expect(toggleUserActiveSchema.parse({ active: false })).toEqual({ active: false });
    });

    it('rechaza active no booleano y campos desconocidos', () => {
      expect(toggleUserActiveSchema.safeParse({ active: 'yes' }).success).toBe(false);
      expect(toggleUserActiveSchema.safeParse({ active: true, extra: 1 }).success).toBe(false);
    });
  });

  describe('saas updateTenantConfigSchema', () => {
    it('acepta la configuración válida completa', () => {
      const parsed = updateTenantConfigSchema.parse({
        name: 'Clinic',
        locale: 'en',
        timezone: 'UTC',
        currency: 'CLP',
        country_code: 'CL',
        config: { theme: 'dark' },
      });
      expect(parsed.currency).toBe('CLP');
      expect(parsed.config).toEqual({ theme: 'dark' });
    });

    it('rechaza moneda o país con formato inválido', () => {
      expect(updateTenantConfigSchema.safeParse({ currency: 'us' }).success).toBe(false);
      expect(updateTenantConfigSchema.safeParse({ country_code: 'CHL' }).success).toBe(false);
    });

    it('rechaza locale fuera del catálogo y campos desconocidos', () => {
      expect(updateTenantConfigSchema.safeParse({ locale: 'de' }).success).toBe(false);
      expect(updateTenantConfigSchema.safeParse({ hacker: 1 }).success).toBe(false);
    });
  });
});
