import { describe, it, expect } from 'vitest';

describe('Critical Fixes - No Regression', () => {
  describe('init.sql tenant_id', () => {
    it('should have tenant_id in users table', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('db/init.sql', 'utf-8');

      const userTableEnd = content.indexOf('CREATE TABLE doctors');
      const userTableDef = content.substring(0, userTableEnd);
      expect(userTableDef).toContain('tenant_id');
    });

    it('should have tenants table defined', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('db/init.sql', 'utf-8');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS tenants');
    });

    it('should have tenant_id in bookings table', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('db/init.sql', 'utf-8');

      expect(content).toContain('tenant_id');
      const bookingIdx = content.indexOf('CREATE TABLE bookings');
      expect(bookingIdx).not.toBe(-1);
      const afterBookings = content.substring(bookingIdx, content.indexOf(';', bookingIdx) + 1);
      expect(afterBookings).toContain('tenant_id');
    });
  });

  describe('auth middleware token version', () => {
    it('should have token_version in decoded user', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/middlewares/auth.middleware.ts', 'utf-8');

      expect(content).toContain('token_version');
    });

    it('should have authMiddleware decode token_version from JWT (no DB query)', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/middlewares/auth.middleware.ts', 'utf-8');

      // authMiddleware no longer queries DB for token_version
      // It reads token_version from JWT payload
      expect(content).toContain('decoded.token_version');
    });

    it('should have setSecurityHeaders function', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/middlewares/auth.middleware.ts', 'utf-8');

      expect(content).toContain('setSecurityHeaders');
    });
  });
});
