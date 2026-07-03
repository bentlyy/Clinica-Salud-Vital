import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/shared/db.js', () => {
  const mockQuery = vi.fn();
  return {
    pool: { query: mockQuery, on: vi.fn() },
    __mockQuery: mockQuery,
  };
});

// Import db mock to access the shared mockQuery
import { pool } from '../../src/shared/db.js';
const mockQuery = pool.query;

vi.mock('../../src/utils/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('../../src/shared/multi-tenant.service.js', () => ({ tenantService: { loadFromDB: vi.fn() } }));

vi.mock('../../src/seed/admin.seed.js', () => ({ seedDefaultTenant: vi.fn(), seedSuperAdmin: vi.fn(), seedTestTenants: vi.fn(), spreadSeedDates: vi.fn() }));
vi.mock('../../src/seed/seed.js', () => ({ seed: vi.fn(), backfillInvoices: vi.fn() }));
vi.mock('../../src/shared/seed-status.js', () => ({ markSeedComplete: vi.fn(), markSeedFailed: vi.fn() }));
vi.mock('../../src/jobs/reminder.job.js', () => ({ startReminderJob: vi.fn() }));
vi.mock('../../src/jobs/audit-integrity.job.js', () => ({ verifyAuditChain: vi.fn() }));
vi.mock('../../src/shared/email.service.js', () => ({ validateEmailConfig: vi.fn() }));
vi.mock('../../src/shared/sentry.service.js', () => ({ initSentry: vi.fn(), setupExpressErrorHandler: vi.fn() }));
vi.mock('../../src/shared/queue.service.js', () => ({ registerWorkers: vi.fn() }));
vi.mock('../../src/middlewares/security.middleware.js', () => ({ securityMiddleware: [(_req, _res, next) => next()], validateEnvSecurity: vi.fn() }));
vi.mock('../../src/middlewares/tenant.middleware.js', () => ({ tenantMiddleware: (_req, _res, next) => { _req.tenant_id = 'default'; next(); } }));
vi.mock('../../src/middlewares/auth.middleware.js', () => ({ optionalAuth: (_req, _res, next) => next(), authMiddleware: (_req, _res, next) => next(), authorize: () => (_req, _res, next) => next() }));
vi.mock('../../src/middlewares/errorHandler.middleware.js', () => ({ errorHandler: (err, _req, res, _next) => res.status(err.statusCode || 500).json({ error: err.message }), notFoundHandler: (_req, res) => res.status(404).json({ error: 'Not found' }) }));
vi.mock('../../src/middlewares/requestLogger.middleware.js', () => ({ requestLogger: (_req, _res, next) => next() }));
vi.mock('../../src/middlewares/sessionActivity.middleware.js', () => ({ trackActivity: (_req, _res, next) => next() }));

vi.mock('../../src/modules/doctor/doctor.routes.js', () => ({ default: vi.fn() }));
vi.mock('../../src/modules/auth/auth.routes.js', () => ({ default: vi.fn() }));
vi.mock('../../src/modules/booking/booking.routes.js', () => ({ default: vi.fn() }));
vi.mock('../../src/modules/availability/availability.routes.js', () => ({ availabilityRouter: vi.fn(), exceptionRouter: vi.fn() }));
vi.mock('../../src/modules/guest/guest.routes.js', () => ({ default: vi.fn() }));
vi.mock('../../src/modules/clinical-record/clinical-record.routes.js', () => ({ default: vi.fn() }));
vi.mock('../../src/modules/audit/audit.routes.js', () => ({ default: vi.fn() }));
vi.mock('../../src/modules/analytics/analytics.routes.js', () => ({ default: vi.fn() }));
vi.mock('../../src/modules/billing/billing.routes.js', () => ({ default: vi.fn() }));
vi.mock('../../src/modules/laboratory/laboratory.routes.js', () => ({ default: vi.fn() }));
vi.mock('../../src/modules/specialties/specialties.routes.js', () => ({ default: vi.fn() }));
vi.mock('../../src/modules/saas/saas.routes.js', () => ({ default: vi.fn() }));
vi.mock('../../src/modules/super-admin/super-admin.routes.js', () => ({ default: vi.fn() }));

vi.mock('node-cron', () => ({ schedule: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret';
  process.env.ENCRYPTION_KEY = 'test-key-32-chars-minimum-for-test!';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
});

import { app } from '../../src/app.js';

describe('Health endpoint', () => {
  it('returns ok status when DB is reachable', async () => {
    mockQuery.mockResolvedValue({ rows: [{ 1: 1 }] });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.database).toBeDefined();
  });

  it('returns degraded status when DB fails', async () => {
    mockQuery.mockRejectedValue(new Error('DB timeout'));
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.database.status).toBe('error');
  });

  it('returns ok on /api/health as well', async () => {
    mockQuery.mockResolvedValue({ rows: [{ 1: 1 }] });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('includes version and timestamp', async () => {
    mockQuery.mockResolvedValue({ rows: [{ 1: 1 }] });
    const res = await request(app).get('/health');
    expect(res.body.version).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('CORS configuration', () => {
  it('allows configured origin via OPTIONS preflight', async () => {
    const res = await request(app)
      .options('/api/specialties')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('rejects unknown origin', async () => {
    const res = await request(app)
      .options('/api/specialties')
      .set('Origin', 'https://evil.com')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.status).toBe(500);
  });
});

describe('Rate limiting', () => {
  it('health endpoint is not rate limited', async () => {
    mockQuery.mockResolvedValue({ rows: [{ 1: 1 }] });
    for (let i = 0; i < 10; i++) {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    }
  });
});

describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent-route');
    expect(res.status).toBe(404);
  });
});
