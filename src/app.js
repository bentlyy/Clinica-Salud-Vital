import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

import { seedAdmin } from './seed/admin.seed.js';
import { pool } from './shared/db.js';
import { startReminderJob } from './jobs/reminder.job.js';

import doctorRoutes from './modules/doctor/doctor.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import bookingRoutes from './modules/booking/booking.routes.js';
import availabilityRoutes from './modules/availability/availability.routes.js';
import exceptionRoutes from './modules/exception/exception.routes.js';

const app = express();

// ✅ CORS restricted to frontend origin only
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow server-to-server / curl in dev (no origin header)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

app.use(express.json());

// ✅ Global rate limit — 100 req / 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use(globalLimiter);

// ✅ Stricter limit on auth routes — 10 attempts / 15 min
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

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(500).json({ status: 'error', db: 'down' });
  }
});

// ✅ Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Docker healthcheck now guarantees DB is ready before container starts,
    // but keep a lightweight check as safety net for local dev without Docker
    await pool.query('SELECT 1');
    console.log('✅ DB conectada');

    await seedAdmin();

    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });

    startReminderJob();
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();