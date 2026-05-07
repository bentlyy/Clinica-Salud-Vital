import { pool } from '../../shared/db.js';
import * as doctorService from '../doctor/doctor.service.js';
import { validateRut, formatRut } from '../../shared/rut.js';
import { sendEmail } from '../../shared/email.service.js';
import { guestConfirmationEmail } from './guest.email.js';
import jwt from 'jsonwebtoken';
import { getJWTSecret } from '../../shared/jwt.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { getDayOfWeek, isValidDate, isValidTime } from '../../shared/date.js';

interface GuestBookingInput {
  doctor_id: number;
  date: string;
  time: string;
  duration?: number;
  rut: string;
  name?: string;
  email: string;
  phone?: string;
}

export const checkRutBlocked = async (rut: string): Promise<boolean> => {
  const result = await pool.query(
    `SELECT blocked_until FROM users WHERE rut = $1`,
    [rut]
  );
  if (result.rows.length === 0) return false;
  if (!result.rows[0].blocked_until) return false;
  return new Date(result.rows[0].blocked_until) > new Date();
};

export const createGuestBooking = async ({ doctor_id, date, time, duration = 30, rut, name, email, phone }: GuestBookingInput): Promise<unknown> => {
  if (!doctor_id || !date || !time || !rut || !email) {
    throw new BadRequestError('Missing required fields');
  }
  if (!validateRut(rut)) throw new BadRequestError('RUT inválido');
  if (!isValidDate(date)) throw new BadRequestError('Formato de fecha inválido');
  if (!isValidTime(time)) throw new BadRequestError('Formato de hora inválido');

  const isBlocked = await checkRutBlocked(rut);
  if (isBlocked) {
    const result = await pool.query(`SELECT blocked_until FROM users WHERE rut = $1`, [rut]);
    const blockedUntil = new Date(result.rows[0].blocked_until).toLocaleDateString('es-CL');
    throw new BadRequestError(`Tu RUT está bloqueado hasta el ${blockedUntil} por no confirmar citas anteriores.`);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext($1::text || $2))`,
      [doctor_id, date]
    );

    const doctor = await doctorService.getDoctorById(doctor_id);
    if (!doctor) throw new BadRequestError('Doctor no encontrado');

    const day = getDayOfWeek(date);

    const availability = await client.query(
      `SELECT start_time, end_time FROM doctor_availability
       WHERE doctor_id = $1 AND day_of_week = $2`,
      [doctor_id, day]
    );

    if (availability.rows.length === 0) throw new BadRequestError('Doctor no disponible en este día');

    const start = new Date(`1970-01-01T${time}`);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + duration);

    const isInsideAnyBlock = availability.rows.some((a: { start_time: string; end_time: string }) => {
      const startLimit = new Date(`1970-01-01T${a.start_time}`);
      const endLimit = new Date(`1970-01-01T${a.end_time}`);
      return start >= startLimit && end <= endLimit;
    });

    if (!isInsideAnyBlock) throw new BadRequestError('Fuera del horario de disponibilidad');

    const exceptions = await client.query(
      `SELECT * FROM doctor_exceptions WHERE doctor_id = $1 AND date = $2`,
      [doctor_id, date]
    );

    for (const ex of exceptions.rows) {
      if (ex.is_full_day) throw new BadRequestError('Doctor no disponible (día bloqueado)');
      if (ex.start_time && ex.end_time) {
        const exStart = new Date(`1970-01-01T${ex.start_time}`);
        const exEnd = new Date(`1970-01-01T${ex.end_time}`);
        if (start < exEnd && end > exStart) throw new BadRequestError('Horario bloqueado por el doctor');
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

    if (overlap.rows.length > 0) throw new BadRequestError('Este horario ya está reservado');

    const formattedRut = formatRut(rut);
    const confirmToken = jwt.sign(
      { rut, email, doctor_id, date, time },
      getJWTSecret(),
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
    }).catch((err: unknown) => logger.error('Email error:', err));

    return booking;

  } catch (error: unknown) {
     await client.query('ROLLBACK');
    const pgError = error as { code?: string };
    if (pgError.code === '23505') throw new BadRequestError('Este horario ya está reservado');
    if (error instanceof BadRequestError || error instanceof NotFoundError) throw error;
    throw new BadRequestError((error as Error).message || 'Error en la base de datos');
  } finally {
    client.release();
  }
};

export const getGuestBookingsByRut = async (rut: string): Promise<unknown[]> => {
  const cleanedRut = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  const result = await pool.query(`
    SELECT b.id, b.date, b.time, b.duration, b.status, b.confirmed,
           d.name AS doctor_name, d.specialty
    FROM bookings b
    JOIN doctors d ON b.doctor_id = d.id
    LEFT JOIN users u ON b.user_id = u.id
    WHERE (
      REPLACE(REPLACE(b.guest_rut, '.', ''), '-', '') = $1
      OR REPLACE(REPLACE(u.rut, '.', ''), '-', '') = $1
    ) AND b.status != 'cancelled'
    ORDER BY b.date, b.time
  `, [cleanedRut]);
  return result.rows;
};

export const cancelGuestBooking = async (bookingId: number, userId: number, userRole?: string): Promise<{ message: string }> => {
  const canCancelAny = userRole === 'admin' || userRole === 'doctor';
  const result = await pool.query(
    `UPDATE bookings SET status = 'cancelled'
     WHERE id = $1 AND (user_id = $2${canCancelAny ? ' OR true' : ''})
     RETURNING *`,
    [bookingId, userId]
  );

  if (result.rows.length === 0) throw new NotFoundError('Reserva no encontrada');
  return { message: 'Reserva cancelada correctamente' };
};