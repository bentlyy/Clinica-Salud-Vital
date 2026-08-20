import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import { resolve } from 'path';
import fs from 'fs';

import { seed, backfillInvoices, backfillMedicalHistory, backfillLabRequests, backfillLabNotifications, backfillUser1Data } from './seed/seed.js';
import { markSeedComplete, markSeedFailed } from './shared/seed-status.js';
import { pool } from './shared/db.js';
import { tenantService } from './shared/multi-tenant.service.js';
import { seedDefaultTenant, seedSuperAdmin, seedTestTenants, spreadSeedDates } from './seed/admin.seed.js';
import { startReminderJob } from './jobs/reminder.job.js';
import { verifyAuditChain } from './jobs/audit-integrity.job.js';
import { securityMiddleware, validateEnvSecurity } from './middlewares/security.middleware.js';
import { tenantMiddleware } from './middlewares/tenant.middleware.js';
import { optionalAuth } from './middlewares/auth.middleware.js';
import { validateEmailConfig } from './shared/email.service.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { correlationIdMiddleware } from './middlewares/correlationId.middleware.js';
import { csrfProtection } from './middlewares/csrf.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware.js';
import { trackActivity, stopSessionCleanup } from './middlewares/sessionActivity.middleware.js';
import { initSentry, setupExpressErrorHandler } from './shared/sentry.service.js';
import { logger } from './utils/logger.js';
import { toError } from './utils/errors.js';
import cron from 'node-cron';
import { registerWorkers, startQueueProcessor, stopQueueProcessor } from './shared/queue.service.js';
import pkg from '../package.json';
import type { QueryConfig } from 'pg';

declare global {
  var stripeWarning: boolean | undefined;
}

import doctorRoutes from './modules/doctor/doctor.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import bookingRoutes from './modules/booking/booking.routes.js';
import { availabilityRouter, exceptionRouter } from './modules/availability/availability.routes.js';
import guestRoutes from './modules/guest/guest.routes.js';

import clinicalRecordRoutes from './modules/clinical-record/clinical-record.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import laboratoryRoutes from './modules/laboratory/laboratory.routes.js';
import specialtiesRoutes from './modules/specialties/specialties.routes.js';
import saasRoutes from './modules/saas/saas.routes.js';
import superAdminRoutes from './modules/super-admin/super-admin.routes.js';
import medicalHistoryRoutes from './modules/medical-history/medical-history.routes.js';
import reportRoutes from './modules/reports/report.routes.js';
import waitlistRoutes from './modules/waitlist/waitlist.routes.js';
import holidaysRoutes from './modules/holidays/holidays.routes.js';
import attachmentsRoutes from './modules/attachments/attachments.routes.js';
import dataPortabilityRoutes from './modules/data-portability/data-portability.routes.js';
import webhooksRoutes from './modules/webhooks/webhooks.routes.js';
import calendarRoutes from './modules/calendar/calendar.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';

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

    const poolStatus = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    };

    res.json({
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: pkg.version,
      checks: {
        database: { status: dbStatus, latency_ms: dbLatency, pool: poolStatus },
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
app.get('/api/health', healthHandler);

app.use('/api', securityMiddleware);
app.use(compression());

const frontendUrl = process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173';
const allowedOrigins = [
  'http://localhost:5173',
  frontendUrl,
  process.env.RENDER_EXTERNAL_URL,
].filter((origin): origin is string => Boolean(origin));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
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

if (process.env.NODE_ENV === 'production') {
  const frontendPath = resolve(__dirname, '../frontend/dist');
  const indexPath = resolve(frontendPath, 'index.html');
  app.use(express.static(frontendPath));
  app.get(/^\/(?!api\/)/, (_req, res) => {
    res.sendFile(indexPath);
  });
}

// COOKIE_SECRET must be set independently of JWT_SECRET; do not share secrets between mechanisms
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json({ limit: '100kb' }));
app.use(csrfProtection);
app.use(optionalAuth);
app.use(tenantMiddleware);
app.use(trackActivity);

app.use(correlationIdMiddleware);
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
  skip: (req) => req.path === '/health' || req.path === '/api/health',
  handler: (req, res) => {
    logger.warn('Rate limit exceeded (global)', { path: req.path, ip: req.ip, tenant_id: req.tenant_id });
    res.status(429).json({ error: 'Too many requests, please try again later' });
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
  keyGenerator: (req: Request) => `auth:${req.ip}:${(req.body?.email || '') as string}`,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded (auth)', { email: req.body?.email, ip: req.ip });
    res.status(429).json({ error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' });
  },
});

const phiWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many PHI write requests. Please slow down.' },
  keyGenerator: (req) => req.tenant_id ? `phi:${req.tenant_id}:${req.user?.id || req.ip}` : `phi:${req.ip}`,
});

app.use(globalLimiter);
app.use('/api/auth', authLimiter);

const API_PREFIX = '/api';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/doctors`, doctorRoutes);
app.use(`${API_PREFIX}/bookings`, bookingRoutes);
app.use(`${API_PREFIX}/availability`, availabilityRouter);
app.use(`${API_PREFIX}/availability-exceptions`, exceptionRouter);
app.use(`${API_PREFIX}/guest`, guestRoutes);

app.use(`${API_PREFIX}/clinical-records`, phiWriteLimiter);
app.use(`${API_PREFIX}/clinical-records`, clinicalRecordRoutes);
app.use(`${API_PREFIX}/audit`, auditRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/billing`, billingRoutes);
app.use(`${API_PREFIX}/laboratory`, laboratoryRoutes);
app.use(`${API_PREFIX}/specialties`, specialtiesRoutes);
app.use(`${API_PREFIX}/saas`, saasRoutes);
app.use(`${API_PREFIX}/super-admin`, superAdminRoutes);
app.use(`${API_PREFIX}/medical-history`, medicalHistoryRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/waitlist`, waitlistRoutes);
app.use(`${API_PREFIX}/holidays`, holidaysRoutes);
app.use(`${API_PREFIX}/attachments`, attachmentsRoutes);
app.use(`${API_PREFIX}/export`, dataPortabilityRoutes);
app.use(`${API_PREFIX}/webhooks`, webhooksRoutes);
app.use(`${API_PREFIX}/calendar`, calendarRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);

setupExpressErrorHandler(app);
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const step = (label: string) => logger.info(`[STARTUP] ${label}`);

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
    const migrationsDir = resolve(__dirname, '../db/migrations');
    if (fs.existsSync(migrationsDir)) {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, applied_at TIMESTAMP DEFAULT NOW())`
      );
      await pool.query('DELETE FROM _migrations');
      logger.info('Migraciones previas limpiadas para re-ejecución');
    }
  }

  const migrationsDir = resolve(__dirname, '../db/migrations');
  if (!fs.existsSync(migrationsDir)) {
    logger.warn(`[MIGRATION] directorio de migraciones NO encontrado: ${migrationsDir} — se omiten migraciones`);
    return;
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, applied_at TIMESTAMP DEFAULT NOW())`
  );

  if (!exists) {
    await pool.query('DELETE FROM _migrations');
    logger.info('Migraciones previas limpiadas para re-ejecución');
  }

  const appliedRes = await pool.query('SELECT name FROM _migrations');
  logger.info(`[MIGRATION] migraciones registradas (${appliedRes.rows.length}): ${appliedRes.rows.map((r: { name: string }) => r.name).join(', ')}`);

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const already = await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
    if (already.rows.length > 0) continue;

    logger.info(`Aplicando migración ${file}...`);
    const sql = fs.readFileSync(resolve(migrationsDir, file), 'utf-8');
    const MAX_MIGRATION_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_MIGRATION_ATTEMPTS; attempt++) {
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        logger.info(`Migración ${file} aplicada`);
        break;
      } catch (migErr) {
        const isLastAttempt = attempt === MAX_MIGRATION_ATTEMPTS;
        logger.error(`Error en migración ${file} (intento ${attempt}/${MAX_MIGRATION_ATTEMPTS})`, {
          error: (migErr as Error).message,
          sql: sql.slice(0, 200),
        });
        if (isLastAttempt) throw migErr;
        await new Promise((r: (value: unknown) => void) => setTimeout(r, attempt * 2000));
      }
    }
  }

  // Reconciliación: si una migración quedó registrada pero su tabla principal no
  // existe (ej. boot previo falló a medias), se re-aplica.
  const RECONCILE: Array<{ file: string; table: string }> = [
    { file: '012_booking_status_history.sql', table: 'booking_status_history' },
  ];
  for (const rec of RECONCILE) {
    if (!migrationFiles.includes(rec.file)) continue;
    const registered = (await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [rec.file])).rows.length > 0;
    const tablePresent = (await pool.query(
      'SELECT 1 FROM information_schema.tables WHERE table_name = $1',
      [rec.table]
    )).rows.length > 0;
    if (registered && !tablePresent) {
      logger.warn(`[MIGRATION] ${rec.file} registrada pero tabla "${rec.table}" no existe — re-aplicando`);
      const sql = fs.readFileSync(resolve(migrationsDir, rec.file), 'utf-8');
      await pool.query(sql);
      logger.info(`[MIGRATION] ${rec.file} re-aplicada correctamente`);
    }
  }
};

const startServer = async (): Promise<void> => {
  const server = app.listen(PORT, () => {
    logger.info(`API running on http://localhost:${PORT}`);
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    logger.error(`SERVER BIND FAILED: port=${PORT} code=${err.code} message=${err.message}`);
    process.exit(1);
  });

  setImmediate(async () => {
    try {
      logger.info(`[STARTUP] begin PORT=${process.env.PORT || 'undefined'}`);

      step('validateEnvSecurity');
      validateEnvSecurity();

      step('validateEmailConfig');
      validateEmailConfig();

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

      step('DB retry loop');
      for (let attempt = 1; attempt <= 10; attempt++) {
        try {
          await pool.query({ text: 'SELECT 1', signal: AbortSignal.timeout(10000) } as QueryConfig & { signal: AbortSignal });
          break;
        } catch (dbErr) {
          logger.warn(`DB connection attempt ${attempt}/10 failed`, { error: (dbErr as Error).message, code: (dbErr as NodeJS.ErrnoException).code });
          if (attempt === 10) throw dbErr;
          await new Promise((r: (value: unknown) => void) => setTimeout(r, attempt * 2000));
        }
      }
      logger.info('DB conectada');

      step('Set database timeouts');
      try {
        const dbName = process.env.DATABASE_URL?.split('/').pop()?.split('?')[0] || 'clinic';
        await pool.query(`ALTER DATABASE "${dbName}" SET statement_timeout = 30000`);
        await pool.query(`ALTER DATABASE "${dbName}" SET idle_in_transaction_session_timeout = 60000`);
        logger.info('Database timeouts configured');
      } catch {
        logger.warn('Could not set database-wide timeouts (non-superuser) — OK');
      }

      step('runMigration');
      try {
        await runMigration();
      } catch (migErr) {
        logger.error('Migration error (non-fatal, continuing startup)', { error: toError(migErr).message });
      }
      step('registerWorkers');
      registerWorkers();
      step('startQueueProcessor');
      startQueueProcessor();
      step('loadFromDB');
      await tenantService.loadFromDB();
      step('SET SESSION tenant_id');
      await pool.query(`SET SESSION app.tenant_id = 'default'`);
      step('seedDefaultTenant');
      await seedDefaultTenant();
      step('seedSuperAdmin');
      await seedSuperAdmin();
      step('seedTestTenants');
      await seedTestTenants();
      step('seed');
      await seed();
      await backfillInvoices();
      await backfillMedicalHistory();
      await backfillLabRequests();
      await backfillLabNotifications();
      await backfillUser1Data();
      await spreadSeedDates();
      markSeedComplete();

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
          logger.error('Audit chain integrity cron job failed', { error: toError(error).message });
        }
      });
      logger.info('Audit chain integrity cron scheduled (every 6 hours)');
    } catch (error) {
      logger.error('Post-boot initialization failed', { error: toError(error).message, stack: toError(error).stack });
      markSeedFailed(toError(error));
    }
  });
};

process.on('unhandledRejection', (reason) => {
  const mem = process.memoryUsage();
  logger.error('Unhandled Rejection', { reason, memory: { heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`, rss: `${Math.round(mem.rss / 1024 / 1024)}MB` } });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  stopSessionCleanup();
  stopQueueProcessor();
  pool.end().catch((err: unknown) => logger.warn('Pool close error on SIGTERM', toError(err).message));
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  stopSessionCleanup();
  stopQueueProcessor();
  pool.end().catch((err: unknown) => logger.warn('Pool close error on SIGINT', toError(err).message));
  process.exit(0);
});

export { app };
export { startServer };

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    logger.error('Fatal startup error', { error: toError(err).message, stack: toError(err).stack });
    process.exit(1);
  });
}
