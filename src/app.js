import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import doctorRoutes from './modules/doctor/doctor.routes.js';
import authRoutes from './modules/auth/auth.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/doctors', doctorRoutes);
app.use('/api/auth', authRoutes);

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (e) {
    res.status(500).json({ status: 'error', db: 'down' });
  }
});


app.listen(process.env.PORT, () => {
  console.log(`API running on http://localhost:${process.env.PORT}`);
});
