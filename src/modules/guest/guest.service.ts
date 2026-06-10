import { pool } from '../../shared/db.js';
import * as doctorService from '../doctor/doctor.service.js';
import { validateRut, formatRut } from '../../shared/rut.js';
import { sendEmail } from '../../shared/email.service.js';
import { guestConfirmationEmail } from './guest.email.js';
import { jwtManager } from '../../shared/jwt.service.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { isValidDate, isValidTime } from '../../shared/date.js';
import { validateBookingSlot } from '../../shared/booking-utils.js';

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

export const checkRutBlocked = async (rut: string, tenantId: string): Promise<boolean> => {
  if (!tenantId) throw new BadRequestError('Tenant ID es requerido');
  const result = await pool.query(
    'SELECT blocked_until FROM users WHERE rut = $1 AND tenant_id = $2',
    [rut, tenantId]
  );
  if (result.rows.length === 0) return false;
  if (!result.rows[0].blocked_until) return false;
  return new Date(result.rows[0].blocked_until) > new Date();
};

export const createGuestBooking = async ({ doctor_id, date, time, duration = 30, rut, name, email, phone }: GuestBookingInput, tenantId: string): Promise<unknown> => {
  if (!tenantId) throw new BadRequestError('Tenant ID es requerido');
  if (!doctor_id || !date || !time || !rut || !email) {
    throw new BadRequestError('Missing required fields');
  }
  if (!validateRut(rut)) throw new BadRequestError('RUT inválido');
  if (!isValidDate(date)) throw new BadRequestError('Formato de fecha inválido');
  if (!isValidTime(time)) throw new BadRequestError('Formato de hora inválido');

  const isBlocked = await checkRutBlocked(rut, tenantId);
  if (isBlocked) {
    const result = await pool.query('SELECT blocked_until FROM users WHERE rut = $1 AND tenant_id = $2', [rut, tenantId]);
    const blockedUntil = new Date(result.rows[0].blocked_until).toLocaleDateString('es-CL');
    throw new BadRequestError(`Tu RUT está bloqueado hasta el ${blockedUntil} por inasistencia a citas anteriores.`);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext($1::text || $2))`,
      [doctor_id, date]
    );

    const doctor = await doctorService.getDoctorById(doctor_id, tenantId);
    if (!doctor) throw new BadRequestError('Doctor no encontrado');

    await validateBookingSlot({ doctorId: doctor_id, date, time, duration, client, tenantId });

    const formattedRut = formatRut(rut);
    const confirmToken = jwtManager.signInvite(
      { rut, email, doctor_id, date, time, tenant_id: tenantId },
      '7d'
    );

    const result = await client.query(
      `INSERT INTO bookings (doctor_id, date, time, duration, confirmed, guest_rut, guest_name, guest_email, guest_phone, confirmation_token, tenant_id)
       VALUES ($1, $2, $3, $4, true, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [doctor_id, date, time, duration, formattedRut, name, email, phone, confirmToken, tenantId]
    );

    await client.query('COMMIT');

    const booking = result.rows[0];

    sendEmail({
      to: email,
      subject: 'Cita agendada - Salud Vital',
      html: guestConfirmationEmail({
        name: name || 'Paciente',
        doctor: doctor.name,
        date,
        time,
        confirmToken,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
      }),
      tenantId,
    }).then(r => { if (!r.sent) logger.error('Email error:', r.error); });

    return booking;

  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const pgError = error as { code?: string };
    if (pgError.code === '23505') throw new BadRequestError('Este horario ya está reservado');
    throw error;
  } finally {
    client.release();
  }
};

export const getGuestBookingsByRut = async (rut: string, tenantId: string): Promise<unknown[]> => {
  if (!tenantId) throw new BadRequestError('Tenant ID es requerido');
  const cleanedRut = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  const result = await pool.query(`
    SELECT b.id, b.date, b.time, b.duration, b.status, b.confirmed,
           d.name AS doctor_name, d.specialty
    FROM bookings b
    JOIN doctors d ON b.doctor_id = d.id
    LEFT JOIN users u ON b.user_id = u.id AND u.tenant_id = b.tenant_id
    WHERE (
      REPLACE(REPLACE(b.guest_rut, '.', ''), '-', '') = $1
      OR REPLACE(REPLACE(u.rut, '.', ''), '-', '') = $1
    )
    AND b.status != 'cancelled'
    AND b.tenant_id = $2
    AND d.tenant_id = $2
    ORDER BY b.date, b.time
  `, [cleanedRut, tenantId]);
  return result.rows;
};

export const cancelGuestBooking = async (bookingId: number, userIdOrRut?: number | string, userRole?: string, tenantId: string = '', confirmationToken?: string): Promise<{ message: string }> => {
  if (!tenantId) throw new BadRequestError('Tenant ID es requerido');
  const canCancelAny = userRole === 'admin' || userRole === 'doctor';
  let result;

  if (canCancelAny && typeof userIdOrRut === 'number') {
    result = await pool.query(
      'UPDATE bookings SET status = \'cancelled\' WHERE id = $1 AND tenant_id = $2 RETURNING *',
      [bookingId, tenantId]
    );
  } else if (typeof userIdOrRut === 'number') {
    result = await pool.query(
      'UPDATE bookings SET status = \'cancelled\' WHERE id = $1 AND user_id = $2 AND tenant_id = $3 RETURNING *',
      [bookingId, userIdOrRut, tenantId]
    );
  } else if (typeof userIdOrRut === 'string') {
    if (!confirmationToken) {
      throw new BadRequestError('Confirmation token required to cancel guest booking');
    }
    const cleanedRut = userIdOrRut.replace(/[^0-9kK]/g, '').toUpperCase();
    result = await pool.query(
      `UPDATE bookings SET status = 'cancelled'
       WHERE id = $1
         AND REPLACE(REPLACE(guest_rut, '.', ''), '-', '') = $2
         AND guest_rut IS NOT NULL
         AND confirmation_token = $3
         AND tenant_id = $4
       RETURNING *`,
      [bookingId, cleanedRut, confirmationToken, tenantId]
    );
  } else {
    throw new BadRequestError('Debe proporcionar autenticación o RUT para cancelar');
  }

  if (result.rows.length === 0) throw new NotFoundError('Reserva no encontrada');
  return { message: 'Reserva cancelada correctamente' };
};