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

  describe('optionalAuth token version', () => {
    it('should have token_version check in optionalAuth', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/middlewares/auth.middleware.ts', 'utf-8');

      expect(content).toContain('token_version');
      expect(content).toContain('pool.query');
    });

    it('should have authMiddleware verify token_version from DB', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/middlewares/auth.middleware.ts', 'utf-8');

      expect(content).toContain("SELECT token_version FROM users WHERE id = $1");
    });

    it('should degrade gracefully when DB query fails in authMiddleware', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/middlewares/auth.middleware.ts', 'utf-8');

      expect(content).toContain('Auth service unavailable');
    });
  });
});
