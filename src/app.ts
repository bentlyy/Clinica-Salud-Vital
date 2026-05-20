import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import { resolve } from 'path';
import fs from 'fs';

import { seed, backfillInvoices } from './seed/seed.js';
import { pool } from './shared/db.js';
import { startReminderJob } from './jobs/reminder.job.js';
import { startConfirmationJob } from './jobs/confirmation.job.js';
import { securityMiddleware, validateEnvSecurity } from './middlewares/security.middleware.js';
import { tenantMiddleware } from './middlewares/tenant.middleware.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware.js';
import { logger } from './utils/logger.js';

import doctorRoutes from './modules/doctor/doctor.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import bookingRoutes from './modules/booking/booking.routes.js';
import availabilityRoutes from './modules/availability/availability.routes.js';
import exceptionRoutes from './modules/exception/exception.routes.js';
import guestRoutes from './modules/guest/guest.routes.js';
import confirmationRoutes from './modules/confirmation/confirmation.routes.js';
import clinicalRecordRoutes from './modules/clinical-record/clinical-record.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import laboratoryRoutes from './modules/laboratory/laboratory.routes.js';
import rbacRoutes from './modules/rbac/rbac.routes.js';
import mlRoutes from './modules/ml/ml.routes.js';
import specialtiesRoutes from './modules/specialties/specialties.routes.js';
import webhookRoutes from './modules/webhook/webhook.routes.js';

const app: Express = express();

app.get('/health', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(500).json({ status: 'error', db: 'down' });
  }
});

app.use(securityMiddleware);

/* Multi-tenancy */
app.use(tenantMiddleware);

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter((origin): origin is string => Boolean(origin));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

app.use(compression());

app.use(express.json({ limit: '100kb' }));
app.use(requestLogger);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
  skip: (req) => req.path === '/health',
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
});

const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authLimiter, authRoutes);
app.use(`${API_PREFIX}/doctors`, doctorRoutes);
app.use(`${API_PREFIX}/bookings`, bookingRoutes);
app.use(`${API_PREFIX}/availability`, availabilityRoutes);
app.use(`${API_PREFIX}/exceptions`, exceptionRoutes);
app.use(`${API_PREFIX}/guest`, guestRoutes);
app.use(`${API_PREFIX}/confirmation`, confirmationRoutes);
app.use(`${API_PREFIX}/clinical-records`, clinicalRecordRoutes);
app.use(`${API_PREFIX}/audit`, auditRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/billing`, billingRoutes);
app.use(`${API_PREFIX}/laboratory`, laboratoryRoutes);
app.use(`${API_PREFIX}/rbac`, rbacRoutes);
app.use(`${API_PREFIX}/ml`, mlRoutes);
app.use(`${API_PREFIX}/specialties`, specialtiesRoutes);
app.use(`${API_PREFIX}/webhooks`, webhookRoutes);

/* Backward compat: /api/ → /api/v1/ */
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/exceptions', exceptionRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api/confirmation', confirmationRoutes);
app.use('/api/clinical-records', clinicalRecordRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/laboratory', laboratoryRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/specialties', specialtiesRoutes);

/* Serve frontend static files in production */
if (process.env.NODE_ENV === 'production') {
  const frontendPath = resolve(__dirname, '../frontend/dist');
  app.use(express.static(frontendPath));
  app.get('*', (_req, res) => {
    res.sendFile(resolve(frontendPath, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const runMigration = async (): Promise<void> => {
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

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const already = await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
    if (already.rows.length > 0) continue;

    const sql = fs.readFileSync(resolve(migrationsDir, file), 'utf-8');
    await pool.query(sql);
    await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
    logger.info(`Migración ${file} aplicada`);
  }
};

const startServer = async (): Promise<void> => {
  validateEnvSecurity();

  try {
    await pool.query('SELECT 1');
    logger.info('DB conectada');

    await runMigration();
    await seed();
    await backfillInvoices();

    app.listen(PORT, () => {
      logger.info(`API running on http://localhost:${PORT}`);
    });

    startReminderJob();
    startConfirmationJob();
  } catch (error) {
    logger.error('Error starting server', { error: (error as Error).message, stack: (error as Error).stack });
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason });
});

startServer();