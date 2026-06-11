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
import { verifyAuditChain } from './jobs/audit-integrity.job.js';
import { securityMiddleware, validateEnvSecurity } from './middlewares/security.middleware.js';
import { tenantMiddleware } from './middlewares/tenant.middleware.js';
import { optionalAuth } from './middlewares/auth.middleware.js';
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
import cron from 'node-cron';
import { queueService, registerWorkers } from './shared/queue.service.js';
import pkg from '../package.json';

declare global {
  var stripeWarning: boolean | undefined;
}

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

const healthHandler = async (_req: Request, res: Response) => {
  try {
    const startDb = Date.now();
    let dbStatus = 'ok';
    let dbLatency = 0;
    try {
      await pool.query('SELECT 1');
      dbLatency = Date.now() - startDb;
    } catch {
      dbStatus = 'error';
    }

    const mem = process.memoryUsage();
    const memUsed = Math.round(mem.heapUsed / 1024 / 1024);
    const memTotal = Math.round(mem.heapTotal / 1024 / 1024);

    let stripeStatus = 'configured';
    if (global.stripeWarning) stripeStatus = 'stub_mode';

    res.json({
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: pkg.version,
      checks: {
        database: { status: dbStatus, latency_ms: dbLatency },
        stripe: { status: stripeStatus },
        memory: { status: 'ok', heap_used_mb: memUsed, heap_total_mb: memTotal },
      },
    });
  } catch {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: pkg.version,
      checks: {
        database: { status: 'error', latency_ms: 0 },
        stripe: { status: 'unknown' },
        memory: { status: 'unknown', heap_used_mb: 0, heap_total_mb: 0 },
      },
    });
  }
};

app.get('/health', healthHandler);
app.get('/api/v1/health', healthHandler);

app.use(securityMiddleware);
app.use(monitoringMiddleware);

/* CORS must be before tenantMiddleware (OPTIONS preflight has no tenant) */
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

/* Serve frontend static files + SPA catch-all before tenant middleware */
if (process.env.NODE_ENV === 'production') {
  const frontendPath = resolve(__dirname, '../frontend/dist');
  app.use(express.static(frontendPath));
  /* SPA: rutas que no empiezan con /api/ → sirven index.html sin tenant */
  app.get(/^\/(?!api\/)/, (_req, res) => {
    res.sendFile(resolve(frontendPath, 'index.html'));
  });
}

/* Parse cookies before auth/tenant middleware (access_token cookie) */
app.use(cookieParser());

/* Extract tenant_id from JWT before tenant middleware (no falla si no hay token) */
app.use(optionalAuth);

/* Multi-tenancy (usa req.user?.tenant_id si existe) */
app.use(tenantMiddleware);

/* Session activity tracking (fire-and-forget for authenticated users) */
app.use(trackActivity);

app.use(compression());

app.use('/api/saas/webhook/stripe', express.raw({ type: 'application/json' }));
app.use('/api/v1/saas/webhook/stripe', express.raw({ type: 'application/json' }));

app.use(apiVersionRedirect);
app.use(setCsrfCookie);
app.use((req, res, next) => {
  if (req.path.startsWith('/api/saas/webhook/') || req.path.startsWith('/api/v1/saas/webhook/') || req.path === '/health' || req.path === '/api/v1/health') {
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
  keyGenerator: (req) => {
    if (req.tenant_id) return `tenant:${req.tenant_id}:${req.ip || 'unknown'}`;
    return `ip:${req.ip || 'unknown'}`;
  },
  skip: (req) => req.path === '/health' || req.path === '/api/v1/health',
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

const emailAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos para este correo. Intenta de nuevo más tarde.' },
  keyGenerator: (req) => req.body?.email || req.ip,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req.body?.email || req.ip) as string,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Demasiados intentos de registro. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip as string,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiadas solicitudes de renovación. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const token = req.body?.refresh_token || req.cookies?.refresh_token || '';
    const hash = crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
    return `refresh:${hash}`;
  },
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

const phiWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many PHI write requests. Please slow down.' },
  keyGenerator: (req) => req.tenant_id ? `phi:${req.tenant_id}:${req.user?.id || req.ip}` : `phi:${req.ip}`,
});

const complianceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many data export/erase requests. Please slow down.' },
  keyGenerator: (req) => req.tenant_id ? `compliance:${req.tenant_id}:${req.user?.id || req.ip}` : `compliance:${req.ip}`,
});

const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth/change-password`, changePasswordLimiter);
app.use(`${API_PREFIX}/auth/2fa`, twoFALimiter);
app.use(`${API_PREFIX}/auth/logout-all`, logoutAllLimiter);
app.use(`${API_PREFIX}/auth/invite-info`, authLimiter);
app.use(`${API_PREFIX}/auth/forgot-password`, forgotPasswordLimiter);
app.use(`${API_PREFIX}/auth/reset-password`, resetPasswordLimiter);
app.use(`${API_PREFIX}/auth/login`, loginLimiter, emailAuthLimiter);
app.use(`${API_PREFIX}/auth/register`, registerLimiter);
app.use(`${API_PREFIX}/auth/refresh`, refreshLimiter);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/doctors`, doctorRoutes);
app.use(`${API_PREFIX}/bookings`, bookingRoutes);
app.use(`${API_PREFIX}/availability`, availabilityRoutes);
app.use(`${API_PREFIX}/exceptions`, exceptionRoutes);
app.use(`${API_PREFIX}/guest`, guestRoutes);

app.use(`${API_PREFIX}/clinical-records`, phiWriteLimiter);
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
app.use(`${API_PREFIX}/compliance`, complianceLimiter);
app.use(`${API_PREFIX}/compliance`, complianceRoutes);
app.use(`${API_PREFIX}/fhir`, fhirRoutes);

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
        logger.error('████████████████████████████████████████████████████████████████');
        logger.error('█ CRITICAL: STRIPE_SECRET_KEY no configurada                   █');
        logger.error('█ El sistema SaaS NO procesará pagos reales                    █');
        logger.error('█ Configure STRIPE_SECRET_KEY en las variables de entorno      █');
        logger.error('████████████████████████████████████████████████████████████████');
        global.stripeWarning = true;
      } else if (stripeKey.startsWith('sk_test_')) {
        logger.warn('████████████████████████████████████████████████████████████████');
        logger.warn('█ WARNING: STRIPE_SECRET_KEY es de prueba (sk_test_)           █');
        logger.warn('█ Cambiar a sk_live_ para producción real                       █');
        logger.warn('████████████████████████████████████████████████████████████████');
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
      registerWorkers();
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

    app.listen(PORT, () => {
      logger.info(`API running on http://localhost:${PORT}`);
    });

    /* Seed y backfill después de abrir el puerto para que Render detecte el puerto a tiempo */
    await seed();
    await backfillInvoices();

    startReminderJob();

    cron.schedule('0 */6 * * *', async () => {
      try {
        const result = await verifyAuditChain();
        if (!result.valid) {
          logger.warn(`Audit chain integrity check: ${result.brokenLinks} broken links out of ${result.checked}`);
        } else {
          logger.info(`Audit chain integrity check passed: ${result.checked} logs verified`);
        }
      } catch (error) {
        logger.error('Audit chain integrity cron job failed', { error: (error as Error).message });
      }
    });
    logger.info('Audit chain integrity cron scheduled (every 6 hours)');
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