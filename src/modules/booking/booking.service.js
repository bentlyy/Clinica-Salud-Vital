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
    if (!doctor_id || !user_id || !date || !time) {
      throw new Error('Missing required fields');
    }

    // 🔥 Validar formato hora
    const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(time)) {
      throw new Error('Invalid time format (HH:MM)');
    }

    // 🔥 Validar horario laboral
    const hour = parseInt(time.split(':')[0]);
    if (hour < 8 || hour >= 18) {
      throw new Error('Outside working hours (08:00 - 18:00)');
    }

    // 🔥 Validar doctor
    const doctor = await doctorService.getDoctorById(doctor_id);
    if (!doctor) throw new Error('Doctor not found');

    // 🔥 Validar user (extra seguridad)
    const user = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [user_id]
    );
    if (user.rows.length === 0) throw new Error('User not found');

    // 🔥 Insert (la DB maneja duplicados con UNIQUE)
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
    // 🔥 1. Verificar que el booking exista
    const booking = await pool.query(
      'SELECT * FROM bookings WHERE id = $1',
      [booking_id]
    );

    if (booking.rows.length === 0) {
      throw new Error('Booking not found');
    }

    const existingBooking = booking.rows[0];

    // 🔥 2. Validar dueño
    if (existingBooking.user_id !== user_id) {
      throw new Error('Unauthorized to delete this booking');
    }

    // 🔥 3. Eliminar
    await pool.query(
      'DELETE FROM bookings WHERE id = $1',
      [booking_id]
    );

    return { message: 'Booking cancelled successfully' };

  } catch (error) {
    throw error.message ? error : new Error('Database error');
  }
};