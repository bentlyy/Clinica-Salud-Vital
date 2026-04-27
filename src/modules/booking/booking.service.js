import { pool } from '../../shared/db.js';
import * as doctorService from '../doctor/doctor.service.js';

export const getAllBookings = async () => {
  const result = await pool.query(`
    SELECT 
      b.id,
      b.date,
      b.time,
      d.id AS doctor_id,
      d.name AS doctor_name,
      d.specialty,
      u.id AS user_id,
      u.email AS user_email
    FROM bookings b
    JOIN doctors d ON b.doctor_id = d.id
    JOIN users u ON b.user_id = u.id
    ORDER BY b.date, b.time
  `);

  return result.rows;
};

export const createBooking = async ({ doctor_id, user_id, date, time }) => {
  try {
    // 🔥 1. Validaciones básicas
    if (!doctor_id || !user_id || !date || !time) {
      throw new Error('Missing required fields');
    }

    // 🔥 2. Validar formato hora
    const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(time)) {
      throw new Error('Invalid time format (HH:MM)');
    }

    // 🔥 3. Validar horario general (fallback)
    const hour = parseInt(time.split(':')[0]);
    if (hour < 8 || hour >= 18) {
      throw new Error('Outside working hours (08:00 - 18:00)');
    }

    // 🔥 4. Validar doctor
    const doctor = await doctorService.getDoctorById(doctor_id);
    if (!doctor) throw new Error('Doctor not found');

    // 🔥 5. VALIDAR DISPONIBILIDAD REAL (NUEVO 🔥)
    const day = new Date(date).getDay();

    const availability = await pool.query(
      `SELECT 1 FROM doctor_availability
       WHERE doctor_id = $1
       AND day_of_week = $2
       AND start_time <= $3
       AND end_time > $3`,
      [doctor_id, day, time]
    );

    if (availability.rows.length === 0) {
      throw new Error('Doctor not available at this time');
    }

    // 🔥 6. Validar user
    const user = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [user_id]
    );
    if (user.rows.length === 0) throw new Error('User not found');

    // 🔥 7. Insert (DB maneja duplicados con UNIQUE)
    const result = await pool.query(
      `INSERT INTO bookings (doctor_id, user_id, date, time)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [doctor_id, user_id, date, time]
    );

    return result.rows[0];

  } catch (error) {
    // 💣 ERRORES POSTGRES

    if (error.code === '23505') {
      throw new Error('This time slot is already booked');
    }

    if (error.code === '23503') {
      throw new Error('Invalid doctor or user');
    }

    if (error.code === '23502') {
      throw new Error(`Missing field: ${error.column}`);
    }

    if (error.code === '22P02') {
      throw new Error('Invalid data format');
    }

    throw error.message ? error : new Error('Database error');
  }
};

export const getBookingsByUser = async (user_id) => {
  const result = await pool.query(`
    SELECT 
      b.id,
      b.date,
      b.time,
      d.id AS doctor_id,
      d.name AS doctor_name,
      d.specialty
    FROM bookings b
    JOIN doctors d ON b.doctor_id = d.id
    WHERE b.user_id = $1
    ORDER BY b.date, b.time
  `, [user_id]);

  return result.rows;
};

export const deleteBooking = async (booking_id, user_id) => {
  try {
    // 🔥 DELETE seguro (dueño + existencia)
    const result = await pool.query(
      `DELETE FROM bookings 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [booking_id, user_id]
    );

    if (result.rows.length === 0) {
      throw new Error('Booking not found or unauthorized');
    }

    return { message: 'Booking cancelled successfully' };

  } catch (error) {
    throw error.message ? error : new Error('Database error');
  }
};