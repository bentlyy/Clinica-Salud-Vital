import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { pool } from './shared/db.js';

import doctorRoutes from './modules/doctor/doctor.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import bookingRoutes from './modules/booking/booking.routes.js';
import availabilityRoutes from './modules/availability/availability.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/doctors', doctorRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/availability', availabilityRoutes);

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (e) {
    res.status(500).json({ status: 'error', db: 'down' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});