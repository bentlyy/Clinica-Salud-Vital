import { vi } from 'vitest';

process.env.JWT_SECRET = 'test-secret-for-unit-tests-only-32chars';
process.env.INVITE_JWT_SECRET = 'test-invite-secret-for-unit-tests-32chars';
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-32chars';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.EMAIL_USER = 'test@test.com';
process.env.EMAIL_PASS = 'test-pass';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.RECAPTCHA_SECRET_KEY = 'test-recaptcha-key';

global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ success: true }) });
