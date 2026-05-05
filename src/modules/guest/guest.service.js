import { pool } from '../../shared/db.js';
import * as doctorService from '../doctor/doctor.service.js';
import { validateRut, formatRut } from '../../shared/rut.js';
import { sendEmail } from '../../shared/email.service.js';
import { guestConfirmationEmail } from './guest.email.js';
import jwt from 'jsonwebtoken';

const getDayOfWeek = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
};

const isValidDate = (dateStr) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
const isValidTime = (timeStr) => /^\d{2}:\d{2}$/.test(timeStr);

export const checkRutBlocked = async (rut) => {
  const result = await pool.query(
    `SELECT blocked_until FROM users WHERE rut = $1`,
    [rut]
  );
  if (result.rows.length === 0) return false;
  if (!result.rows[0].blocked_until) return false;
  return new Date(result.rows[0].blocked_until) > new Date();
};

export const createGuestBooking = async ({ doctor_id, date, time, duration = 30, rut, name, email, phone }) => {
  if (!doctor_id || !date || !time || !rut || !email) {
    throw new Error('Missing required fields');
  }
  if (!validateRut(rut)) throw new Error('RUT inválido');
  if (!isValidDate(date)) throw new Error('Formato de fecha inválido');
  if (!isValidTime(time)) throw new Error('Formato de hora inválido');

  const isBlocked = await checkRutBlocked(rut);
  if (isBlocked) {
    const result = await pool.query(`SELECT blocked_until FROM users WHERE rut = $1`, [rut]);
    const blockedUntil = new Date(result.rows[0].blocked_until).toLocaleDateString('es-CL');
    throw new Error(`Tu RUT está bloqueado hasta el ${blockedUntil} por no confirmar citas anteriores.`);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext($1::text || $2))`,
      [doctor_id, date]
    );

    const doctor = await doctorService.getDoctorById(doctor_id);
    if (!doctor) throw new Error('Doctor no encontrado');

    const day = getDayOfWeek(date);

    const availability = await client.query(
      `SELECT start_time, end_time FROM doctor_availability
       WHERE doctor_id = $1 AND day_of_week = $2`,
      [doctor_id, day]
    );

    if (availability.rows.length === 0) throw new Error('Doctor no disponible en este día');

    const start = new Date(`1970-01-01T${time}`);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + duration);

    const isInsideAnyBlock = availability.rows.some(a => {
      const startLimit = new Date(`1970-01-01T${a.start_time}`);
      const endLimit = new Date(`1970-01-01T${a.end_time}`);
      return start >= startLimit && end <= endLimit;
    });

    if (!isInsideAnyBlock) throw new Error('Fuera del horario de disponibilidad');

    const exceptions = await client.query(
      `SELECT * FROM doctor_exceptions WHERE doctor_id = $1 AND date = $2`,
      [doctor_id, date]
    );

    for (const ex of exceptions.rows) {
      if (ex.is_full_day) throw new Error('Doctor no disponible (día bloqueado)');
      if (ex.start_time && ex.end_time) {
        const exStart = new Date(`1970-01-01T${ex.start_time}`);
        const exEnd = new Date(`1970-01-01T${ex.end_time}`);
        if (start < exEnd && end > exStart) throw new Error('Horario bloqueado por el doctor');
      }
    }

    const overlap = await client.query(
      `SELECT 1 FROM bookings
       WHERE doctor_id = $1 AND date = $2 AND status != 'cancelled'
       AND (
         (time <= $3 AND (time + (duration || ' minutes')::interval) > $3)
         OR ($3 <= time AND ($3::time + ($4 || ' minutes')::interval) > time)
       )`,
      [doctor_id, date, time, duration]
    );

    if (overlap.rows.length > 0) throw new Error('Este horario ya está reservado');

    const formattedRut = formatRut(rut);
    const confirmToken = jwt.sign(
      { rut, email, doctor_id, date, time },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const result = await client.query(
      `INSERT INTO bookings (doctor_id, date, time, duration, guest_rut, guest_name, guest_email, guest_phone, confirmation_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [doctor_id, date, time, duration, formattedRut, name, email, phone, confirmToken]
    );

    await client.query('COMMIT');

    const booking = result.rows[0];

    sendEmail({
      to: email,
      subject: 'Confirma tu cita médica',
      html: guestConfirmationEmail({
        name: name || 'Paciente',
        doctor: doctor.name,
        date,
        time,
        confirmToken,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
      }),
    }).catch(err => console.error('Email error:', err));

    return booking;

  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') throw new Error('Este horario ya está reservado');
    throw error.message ? error : new Error('Error en la base de datos');
  } finally {
    client.release();
  }
};

export const getGuestBookingsByRut = async (rut) => {
  const result = await pool.query(`
    SELECT b.id, b.date, b.time, b.duration, b.status, b.confirmed,
           d.name AS doctor_name, d.specialty
    FROM bookings b
    JOIN doctors d ON b.doctor_id = d.id
    WHERE b.guest_rut = $1 AND b.status != 'cancelled'
    ORDER BY b.date, b.time
  `, [rut]);
  return result.rows;
};

export const cancelGuestBooking = async (bookingId, userId) => {
  const result = await pool.query(
    `UPDATE bookings SET status = 'cancelled'
     WHERE id = $1 AND (user_id = $2 OR guest_rut IS NOT NULL)
     RETURNING *`,
    [bookingId, userId]
  );

  if (result.rows.length === 0) throw new Error('Reserva no encontrada');
  return { message: 'Reserva cancelada correctamente' };
};
