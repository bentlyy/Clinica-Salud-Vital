import { vi } from 'vitest';

process.env.JWT_SECRET = 'test-secret-for-unit-tests-only';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.EMAIL_USER = 'test@test.com';
process.env.EMAIL_PASS = 'test-pass';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
