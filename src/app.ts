import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import { resolve } from 'path';
import fs from 'fs';
import crypto from 'crypto';

import { seed, backfillInvoices } from './seed/seed.js';
import { pool } from './shared/db.js';
import { tenantService } from './shared/multi-tenant.service.js';
import { seedDefaultTenant, seedSuperAdmin, seedTestTenants } from './seed/admin.seed.js';
import { startReminderJob } from './jobs/reminder.job.js';
import { securityMiddleware, validateEnvSecurity } from './middlewares/security.middleware.js';
import { tenantMiddleware } from './middlewares/tenant.middleware.js';
import { csrfProtection, setCsrfCookie } from './middlewares/csrf.middleware.js';
import { apiVersionRedirect } from './middlewares/apiVersionRedirect.middleware.js';
import { validateEmailConfig } from './shared/email.service.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware.js';
import { monitoringService, monitoringMiddleware } from './middlewares/monitoring.middleware.js';
import { dbMonitor } from './shared/db-monitor.service.js';
import { trackActivity } from './middlewares/sessionActivity.middleware.js';
import { initSentry, setupExpressErrorHandler } from './shared/sentry.service.js';
import { logger } from './utils/logger.js';
import { queueService } from './shared/queue.service.js';

import doctorRoutes from './modules/doctor/doctor.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import bookingRoutes from './modules/booking/booking.routes.js';
import availabilityRoutes from './modules/availability/availability.routes.js';
import exceptionRoutes from './modules/exception/exception.routes.js';
import guestRoutes from './modules/guest/guest.routes.js';

import clinicalRecordRoutes from './modules/clinical-record/clinical-record.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import laboratoryRoutes from './modules/laboratory/laboratory.routes.js';
import rbacRoutes from './modules/rbac/rbac.routes.js';
import mlRoutes from './modules/ml/ml.routes.js';
import specialtiesRoutes from './modules/specialties/specialties.routes.js';
import webhookRoutes from './modules/webhook/webhook.routes.js';
import saasRoutes from './modules/saas/saas.routes.js';
import superAdminRoutes from './modules/super-admin/super-admin.routes.js';
import i18nRoutes from './modules/i18n/i18n.routes.js';
import monitoringRoutes from './modules/monitoring/monitoring.routes.js';
import complianceRoutes from './modules/compliance/compliance.routes.js';
import fhirRoutes from './modules/fhir/fhir.routes.js';

const app: Express = express();

app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

initSentry(app);

app.get('/health', async (req: Request, res: Response) => {
  try {
    const startDb = Date.now();
    await pool.query('SELECT 1');
    const dbLatency = Date.now() - startDb;
    const mem = monitoringService.getMemoryUsage();
    const eventLoopLag = await monitoringService.getEventLoopLag();

    const poolStatus = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };

    let redisStatus = 'not_configured';
    try {
      const { queueService: qs } = await import('./shared/queue.service.js');
      if (qs) redisStatus = 'available';
    } catch {
      redisStatus = 'unavailable';
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: { status: 'connected', latency: `${dbLatency}ms`, pool: poolStatus },
      redis: redisStatus,
      memory: mem,
      eventLoopLag: `${eventLoopLag}ms`,
      uptime: process.uptime(),
    });
  } catch {
    res.status(500).json({ status: 'error', db: 'down' });
  }
});

app.use(securityMiddleware);
app.use(monitoringMiddleware);

/* Serve frontend static files before tenant middleware (no tenant needed) */
if (process.env.NODE_ENV === 'production') {
  const frontendPath = resolve(__dirname, '../frontend/dist');
  app.use(express.static(frontendPath));
}

/* Multi-tenancy */
app.use(tenantMiddleware);

/* Session activity tracking (fire-and-forget for authenticated users) */
app.use(trackActivity);

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  process.env.RENDER_EXTERNAL_URL,
].filter((origin): origin is string => Boolean(origin));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, 'http://localhost:5173');
      }
      return callback(null, false);
    }
    if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
      return callback(new Error('CORS misconfigured: no allowed origins in production'));
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400,
}));

app.use(compression());
app.use(cookieParser());

app.use('/api/saas/webhook/stripe', express.raw({ type: 'application/json' }));
app.use('/api/v1/saas/webhook/stripe', express.raw({ type: 'application/json' }));

app.use(apiVersionRedirect);
app.use(setCsrfCookie);
app.use((req, res, next) => {
  if (req.path.startsWith('/api/saas/webhook/') || req.path.startsWith('/api/v1/saas/webhook/') || req.path === '/health') {
    return next();
  }
  csrfProtection(req, res, next);
});
app.use(express.json({ limit: '100kb' }));
app.use(requestLogger);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator: (req) => req.ip || 'unknown',
  skip: (req) => req.path === '/health',
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
  keyGenerator: (req) => req.ip || 'unknown',
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset attempts, please try again later' },
  keyGenerator: (req) => req.ip || 'unknown',
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset attempts, please try again later' },
  keyGenerator: (req) => req.ip || 'unknown',
});

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password change attempts, please try again later' },
  keyGenerator: (req) => req.ip || 'unknown',
});

const twoFALimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many 2FA attempts, please try again later' },
  keyGenerator: (req) => req.ip || 'unknown',
});

const logoutAllLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many logout-all attempts, please try again later' },
  keyGenerator: (req) => req.ip || 'unknown',
});

const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth/change-password`, changePasswordLimiter);
app.use(`${API_PREFIX}/auth/2fa`, twoFALimiter);
app.use(`${API_PREFIX}/auth/logout-all`, logoutAllLimiter);
app.use(`${API_PREFIX}/auth/invite-info`, authLimiter);
app.use(`${API_PREFIX}/auth/forgot-password`, forgotPasswordLimiter);
app.use(`${API_PREFIX}/auth/reset-password`, resetPasswordLimiter);
app.use(`${API_PREFIX}/auth/login`, authLimiter);
app.use(`${API_PREFIX}/auth/register`, authLimiter);
app.use(`${API_PREFIX}/auth/refresh`, authLimiter);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/doctors`, doctorRoutes);
app.use(`${API_PREFIX}/bookings`, bookingRoutes);
app.use(`${API_PREFIX}/availability`, availabilityRoutes);
app.use(`${API_PREFIX}/exceptions`, exceptionRoutes);
app.use(`${API_PREFIX}/guest`, guestRoutes);

app.use(`${API_PREFIX}/clinical-records`, clinicalRecordRoutes);
app.use(`${API_PREFIX}/audit`, auditRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/billing`, billingRoutes);
app.use(`${API_PREFIX}/laboratory`, laboratoryRoutes);
app.use(`${API_PREFIX}/rbac`, rbacRoutes);
app.use(`${API_PREFIX}/ml`, mlRoutes);
app.use(`${API_PREFIX}/specialties`, specialtiesRoutes);
app.use(`${API_PREFIX}/webhooks`, webhookRoutes);
app.use(`${API_PREFIX}/saas`, saasRoutes);
app.use(`${API_PREFIX}/super-admin`, superAdminRoutes);
app.use(`${API_PREFIX}/i18n`, i18nRoutes);
app.use(`${API_PREFIX}/monitoring`, monitoringRoutes);
app.use(`${API_PREFIX}/compliance`, complianceRoutes);
app.use(`${API_PREFIX}/fhir`, fhirRoutes);

/* SPA catch-all for frontend (after API routes) */
if (process.env.NODE_ENV === 'production') {
  const frontendPath = resolve(__dirname, '../frontend/dist');
  app.get('*', (_req, res) => {
    res.sendFile(resolve(frontendPath, 'index.html'));
  });
}

setupExpressErrorHandler(app);
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const runMigration = async (): Promise<void> => {
  const { rows: [{ exists }] } = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')`
  );
  if (!exists) {
    const initPath = resolve(__dirname, '../db/init.sql');
    if (fs.existsSync(initPath)) {
      const initSql = fs.readFileSync(initPath, 'utf-8');
      await pool.query(initSql);
      logger.info('Esquema inicial (init.sql) aplicado');
    }
    /* Aplicar migrations faltantes después de init.sql */
    const migrationsDir = resolve(__dirname, '../db/migrations');
    if (fs.existsSync(migrationsDir)) {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, applied_at TIMESTAMP DEFAULT NOW())`
      );
      await pool.query('DELETE FROM _migrations');
      logger.info('Migraciones previas limpiadas para re-ejecución');
    }
  }

  const legacyPath = resolve(__dirname, '../db/migrate.sql');
  if (fs.existsSync(legacyPath)) {
    const checkResult = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'guest_rut')`
    );
    if (!checkResult.rows[0].exists) {
      const sql = fs.readFileSync(legacyPath, 'utf-8');
      await pool.query(sql);
      logger.info('Migración legacy aplicada');
    }
  }

  const migrationsDir = resolve(__dirname, '../db/migrations');
  if (!fs.existsSync(migrationsDir)) return;

  await pool.query(
    `CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, applied_at TIMESTAMP DEFAULT NOW())`
  );

  if (!exists) {
    await pool.query('DELETE FROM _migrations');
    logger.info('Migraciones previas limpiadas para re-ejecución');
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const already = await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
    if (already.rows.length > 0) continue;

    logger.info(`Aplicando migración ${file}...`);
    const sql = fs.readFileSync(resolve(migrationsDir, file), 'utf-8');
    try {
      await pool.query(sql);
    } catch (migErr) {
      logger.error(`Error en migración ${file}`, {
        error: (migErr as Error).message,
        sql: sql.slice(0, 200),
      });
      throw migErr;
    }
    await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
    logger.info(`Migración ${file} aplicada`);
  }

  /* Schema drift detection */
  const initPath = resolve(__dirname, '../db/init.sql');
  if (fs.existsSync(initPath)) {
    const initContent = fs.readFileSync(initPath, 'utf-8');
    const initHash = crypto.createHash('sha256').update(initContent).digest('hex').slice(0, 16);

    await pool.query(
      `CREATE TABLE IF NOT EXISTS _schema_meta (key VARCHAR(255) PRIMARY KEY, value TEXT NOT NULL)`
    );

    const { rows: [stored] } = await pool.query(
      `SELECT value FROM _schema_meta WHERE key = 'init_hash'`
    );

    if (!stored) {
      await pool.query(
        `INSERT INTO _schema_meta (key, value) VALUES ('init_hash', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [initHash]
      );
    } else if (stored.value !== initHash) {
      logger.warn(`[SCHEMA DRIFT] init.sql hash changed from ${stored.value} to ${initHash}. Migrations may be out of sync with base schema.`);
    }
  }
};

const startServer = async (): Promise<void> => {
  try {
    validateEnvSecurity();
    validateEmailConfig();

    /* Validate Stripe is configured in production (optional) */
    if (process.env.NODE_ENV === 'production') {
      const stripeKey = process.env.STRIPE_SECRET_KEY || '';
      if (!stripeKey) {
        logger.warn('⚠️ STRIPE_SECRET_KEY no configurada — pagos SaaS deshabilitados');
      } else if (!stripeKey.startsWith('sk_live_')) {
        throw new Error('STRIPE_SECRET_KEY must be configured with a live key in production mode');
      }
    }

    /* Retry DB connection with backoff (Render startup race condition) */
    for (let attempt = 1; attempt <= 10; attempt++) {
      try {
        await pool.query('SELECT 1');
        break;
      } catch (dbErr) {
        if (attempt === 10) throw dbErr;
        logger.warn(`DB connection attempt ${attempt}/10 failed, retrying...`, (dbErr as Error).message);
        await new Promise((r: (value: unknown) => void) => setTimeout(r, attempt * 2000));
      }
    }
    logger.info('DB conectada');

    /* Set database-wide timeouts for safety (one-time, persists across restarts) */
    try {
      const dbName = process.env.DATABASE_URL?.split('/').pop()?.split('?')[0] || 'clinic';
      await pool.query(`ALTER DATABASE "${dbName}" SET statement_timeout = 30000`);
      await pool.query(`ALTER DATABASE "${dbName}" SET idle_in_transaction_session_timeout = 60000`);
      logger.info('Database timeouts configured');
    } catch {
      logger.warn('Could not set database-wide timeouts (non-superuser) — OK');
    }

    await runMigration();

    /* Initialize async job queue (BullMQ if Redis available, memory fallback) */
    try {
      await queueService.initialize();
      logger.info('Queue service initialized');
    } catch (err) {
      logger.warn('Queue service not available (emails will work synchronously)', { error: (err as Error).message });
    }

    await tenantService.loadFromDB();

    /* Set tenant context for seed operations (RLS context) */
    await pool.query(`SET SESSION app.tenant_id = 'default'`);

    await seedDefaultTenant();
    await seedSuperAdmin();
    await seedTestTenants();
    tenantService.startRefresh();

    await seed();
    await backfillInvoices();

    app.listen(PORT, () => {
      logger.info(`API running on http://localhost:${PORT}`);
    });

    startReminderJob();
  } catch (error) {
    logger.error('Error starting server', { error: (error as Error).message, stack: (error as Error).stack });
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  const mem = process.memoryUsage();
  logger.error('Unhandled Rejection', { reason, memory: { heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`, rss: `${Math.round(mem.rss / 1024 / 1024)}MB` } });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  monitoringService.stop();
  dbMonitor.stop();
  pool.end().catch((err: unknown) => logger.warn('Pool close error on SIGTERM', (err as Error).message));
  tenantService.stopRefresh();
  queueService.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  monitoringService.stop();
  dbMonitor.stop();
  pool.end().catch((err: unknown) => logger.warn('Pool close error on SIGINT', (err as Error).message));
  tenantService.stopRefresh();
  queueService.destroy();
  process.exit(0);
});

startServer().catch((err) => {
  logger.error('Fatal startup error', { error: (err as Error).message, stack: (err as Error).stack });
  process.exit(1);
});