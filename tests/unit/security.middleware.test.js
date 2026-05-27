import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLogger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }));

vi.mock('../../src/utils/logger.js', () => ({
  logger: mockLogger,
}));

const originalEnv = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env = { ...originalEnv };
  delete process.env.JWT_SECRET;
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
      process.env.JWT_SECRET = 'a'.repeat(32);
      const { validateEnvSecurity } = await import('../../src/middlewares/security.middleware.js');
      expect(() => validateEnvSecurity()).not.toThrow();
    });

    it('logs warning in development mode', async () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.NODE_ENV = 'development';
      mockLogger.warn.mockClear();
      const { validateEnvSecurity } = await import('../../src/middlewares/security.middleware.js');
      validateEnvSecurity();
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('modo desarrollo'));
    });

    it('does not log warning in production', async () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
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
      expect(securityMiddleware.length).toBe(2);
    });
  });
});
