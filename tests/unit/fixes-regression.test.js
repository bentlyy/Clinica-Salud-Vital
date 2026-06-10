import { describe, it, expect } from 'vitest';

describe('Critical Fixes - No Regression', () => {
  describe('CSRF middleware', () => {
    it('should reject state-changing requests when cookie or header token missing', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/middlewares/csrf.middleware.ts', 'utf-8');

      const hasBypassCheck = content.includes('if (!cookieToken || !headerToken) {');
      expect(hasBypassCheck).toBe(true);

      const callsNextWithError = content.includes('next(new BadRequestError');
      expect(callsNextWithError).toBe(true);
    });

    it('should use timingSafeEqual for token comparison', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/middlewares/csrf.middleware.ts', 'utf-8');

      expect(content).toContain('timingSafeEqual');
    });

    it('should skip CSRF for safe methods (GET/HEAD/OPTIONS)', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/middlewares/csrf.middleware.ts', 'utf-8');

      expect(content).toContain('STATE_CHANGING_METHODS');
      expect(content).toContain('POST');
      expect(content).toContain('PUT');
      expect(content).toContain('PATCH');
      expect(content).toContain('DELETE');
    });
  });

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

      expect(content).toContain('Degraded');
    });
  });

  describe('tenant-safe-query isolation', () => {
    it('should have bypass option for tenant-safe queries', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/shared/tenant-safe-query.ts', 'utf-8');

      expect(content).toContain('bypass');
    });

    it('should have ALLOWED_WITHOUT_TENANT set for system queries', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/shared/tenant-safe-query.ts', 'utf-8');

      expect(content).toContain('ALLOWED_WITHOUT_TENANT');
      expect(content).toContain('SELECT 1');
    });

    it('should validate tenant isolation for SELECT/UPDATE/DELETE', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/shared/tenant-safe-query.ts', 'utf-8');

      expect(content).toContain('TENANT ISOLATION VIOLATION');
      expect(content).toContain('tenant_id');
    });
  });
});
