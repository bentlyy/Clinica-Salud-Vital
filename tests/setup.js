import { vi } from 'vitest';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

process.env.JWT_SECRET = 'test-secret-for-unit-tests-only-32chars';
process.env.INVITE_JWT_SECRET = 'test-invite-secret-for-unit-tests-32chars';
process.env.CONFIRM_JWT_SECRET = 'test-confirm-secret-for-unit-tests-32chars';
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-32chars';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.EMAIL_USER = 'test@test.com';
process.env.EMAIL_PASS = 'test-pass';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.RECAPTCHA_SECRET_KEY = 'test-recaptcha-key';
process.env.PHI_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.AUDIT_HMAC_SECRET = 'test-secret-32-chars-minimum-length!!';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

// Pre-generate RSA keys for JWT RS256 (jwtManager needs them at import time)
const keysDir = path.join(os.tmpdir(), 'clinic-test-keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const kid = 'test-key-001';
  fs.writeFileSync(path.join(keysDir, `jwt-${kid}.pem`), privateKey, 'utf-8');
  fs.writeFileSync(path.join(keysDir, `jwt-${kid}.pub`), publicKey, 'utf-8');
}
process.env.JWT_KEYS_DIR = keysDir;

global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ success: true }) });


