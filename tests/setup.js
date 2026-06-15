import { vi } from 'vitest';

process.env.JWT_SECRET = 'test-secret-for-unit-tests-only-32chars';
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-32chars';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.EMAIL_USER = 'test@test.com';
process.env.EMAIL_PASS = 'test-pass';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.RECAPTCHA_SECRET_KEY = 'test-recaptcha-key';
process.env.AUDIT_HMAC_SECRET = 'test-secret-32-chars-minimum-length!!';

global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ success: true }) });

// Prevent unhandled rejections from pg-pool (no DB in tests) from failing CI
process.on('unhandledRejection', function(reason) {
  var msg = reason && typeof reason === 'object' && 'message' in reason
    ? reason.message
    : String(reason);
  if (msg.includes('ECONNREFUSED') || msg.includes('pg-pool') || msg.includes('connect ECONN')) {
    return;
  }
});


