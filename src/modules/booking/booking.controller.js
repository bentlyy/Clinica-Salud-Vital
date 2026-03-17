import { pool } from '../../shared/db.js';

export const getBookings = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.*, 
        d.name as doctor_name,
        u.email as user_email
      FROM bookings b
      JOIN doctors d ON b.doctor_id = d.id
      JOIN users u ON b.user_id = u.id
      ORDER BY b.date, b.time
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createBooking = async (req, res) => {
  const { doctor_id, user_id, date, time } = req.body;

  try {
    if (!doctor_id || !user_id || !date || !time) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // 🔥 validar doctor
    const doctor = await pool.query(
      'SELECT id FROM doctors WHERE id = $1',
      [doctor_id]
    );

    if (doctor.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // 🔥 validar usuario
    const user = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [user_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 🔥 evitar doble reserva
    const existing = await pool.query(
      `SELECT 1 FROM bookings 
       WHERE doctor_id = $1 AND date = $2 AND time = $3`,
      [doctor_id, date, time]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Doctor already booked at this time'
      });
    }

    // 🔥 crear
    const result = await pool.query(
      `INSERT INTO bookings (doctor_id, user_id, date, time)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [doctor_id, user_id, date, time]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};