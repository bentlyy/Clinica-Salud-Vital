import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

import { seedAdmin } from './seed/admin.seed.js';
import { pool } from './shared/db.js';
import { startReminderJob } from './jobs/reminder.job.js';
import { startConfirmationJob } from './jobs/confirmation.job.js';

import doctorRoutes from './modules/doctor/doctor.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import bookingRoutes from './modules/booking/booking.routes.js';
import availabilityRoutes from './modules/availability/availability.routes.js';
import exceptionRoutes from './modules/exception/exception.routes.js';
import guestRoutes from './modules/guest/guest.routes.js';
import confirmationRoutes from './modules/confirmation/confirmation.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

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

app.use(express.json());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/exceptions', exceptionRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api/confirmation', confirmationRoutes);

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(500).json({ status: 'error', db: 'down' });
  }
});

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

const runMigration = async () => {
  const migrationPath = resolve(__dirname, '../db/migrate.sql');
  if (!fs.existsSync(migrationPath)) return;

  const checkResult = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'guest_rut')`
  );

  if (checkResult.rows[0].exists) {
    console.log('✅ DB schema actualizado (sin migración necesaria)');
    return;
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');
  await pool.query(sql);
  console.log('✅ Migración aplicada');
};

const startServer = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ DB conectada');

    await runMigration();
    await seedAdmin();

    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });

    startReminderJob();
    startConfirmationJob();
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();
