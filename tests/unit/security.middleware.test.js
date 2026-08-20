import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLogger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }));

vi.mock('../../src/utils/logger.js', () => ({
  logger: mockLogger,
}));

const originalEnv = process.env;
const VALID_AUDIT_SECRET = 'a'.repeat(32);
const VALID_COOKIE_SECRET = 'c'.repeat(32);
const VALID_JWT_SECRET = 'b'.repeat(32);

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env = { ...originalEnv };
  process.env.COOKIE_SECRET = VALID_COOKIE_SECRET;
  delete process.env.JWT_SECRET;
  delete process.env.AUDIT_HMAC_SECRET;
});

describe('security.middleware', () => {
  describe('validateEnvSecurity', () => {
    it('throws when JWT_SECRET is not defined', async () => {
      const { validateEnvSecurity } = await import('../../src/middlewares/security.middleware.js');
      expect(() => validateEnvSecurity()).toThrow('JWT_SECRET no está definido');
    });

    it('throws when JWT_SECRET is default value', async () => {
      process.env.JWT_SECRET = 'CHANGE_ME_USE_LONG_RANDOM_SECRET_IN_PRODUCTION';
      const { validateEnvSecurity } = await import('../../src/middlewares/security.middleware.js');
      expect(() => validateEnvSecurity()).toThrow('valor por defecto');
    });

    it('throws when JWT_SECRET is too short', async () => {
      process.env.JWT_SECRET = 'short';
      const { validateEnvSecurity } = await import('../../src/middlewares/security.middleware.js');
      expect(() => validateEnvSecurity()).toThrow('al menos 32 caracteres');
    });

    it('passes with valid JWT_SECRET', async () => {
      process.env.JWT_SECRET = VALID_JWT_SECRET;
      process.env.AUDIT_HMAC_SECRET = VALID_AUDIT_SECRET;
      const { validateEnvSecurity } = await import('../../src/middlewares/security.middleware.js');
      expect(() => validateEnvSecurity()).not.toThrow();
    });

    it('logs warning in development mode', async () => {
      process.env.JWT_SECRET = VALID_JWT_SECRET;
      process.env.AUDIT_HMAC_SECRET = VALID_AUDIT_SECRET;
      process.env.NODE_ENV = 'development';
      mockLogger.warn.mockClear();
      const { validateEnvSecurity } = await import('../../src/middlewares/security.middleware.js');
      validateEnvSecurity();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('modo desarrollo'));
    });

    it('does not log warning in production', async () => {
      process.env.JWT_SECRET = VALID_JWT_SECRET;
      process.env.AUDIT_HMAC_SECRET = VALID_AUDIT_SECRET;
      process.env.ENCRYPTION_KEY = 'e'.repeat(32);
      process.env.RECAPTCHA_SECRET_KEY = 'test-recaptcha-key';
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.NODE_ENV = 'production';
      mockLogger.warn.mockClear();
      const { validateEnvSecurity } = await import('../../src/middlewares/security.middleware.js');
      validateEnvSecurity();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('securityMiddleware array', () => {
    it('exports helmet and hpp middleware', async () => {
      const { securityMiddleware } = await import('../../src/middlewares/security.middleware.js');
      expect(Array.isArray(securityMiddleware)).toBe(true);
      expect(securityMiddleware.length).toBe(3);
    });
  });
});
