import { pool } from '../../shared/db.js';
import * as doctorService from '../doctor/doctor.service.js';
import { sendEmail } from '../../shared/email.service.js';
import { bookingConfirmationTemplate } from './booking.email.js';
import jwt from 'jsonwebtoken';
import { getJWTSecret } from '../../shared/jwt.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { getDayOfWeek, isValidDate, isValidTime } from '../../shared/date.js';

interface BookingInput {
  doctor_id: number;
  user_id: number;
  date: string;
  time: string;
  duration?: number;
  rut?: string;
  name?: string;
  phone?: string;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

interface BookingData {
  data: unknown[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getAllBookings = async ({ page = 1, limit = 50 }: PaginationOptions = {}): Promise<BookingData> => {
  const offset = (page - 1) * limit;
  const result = await pool.query(`
    SELECT
      b.id, b.date, b.time, b.duration, b.status, b.confirmed,
      d.id AS doctor_id, d.name AS doctor_name, d.specialty,
      u.id AS user_id, u.email AS user_email,
      b.guest_rut, b.guest_name, b.guest_email
    FROM bookings b
    JOIN doctors d ON b.doctor_id = d.id
    LEFT JOIN users u ON b.user_id = u.id
    WHERE b.status != 'cancelled'
    ORDER BY b.date, b.time
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM bookings WHERE status != 'cancelled'`
  );

  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  };
};

export const createBooking = async ({ doctor_id, user_id, date, time, duration = 30 }: BookingInput): Promise<unknown> => {
  if (!doctor_id || !user_id || !date || !time) throw new BadRequestError('Missing required fields');
  if (!isValidDate(date)) throw new BadRequestError('Invalid date format, use YYYY-MM-DD');
  if (!isValidTime(time)) throw new BadRequestError('Invalid time format, use HH:MM');
  if (duration <= 0 || duration > 480) throw new BadRequestError('Duration must be between 1 and 480 minutes');

  const bookingDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (bookingDate < today) throw new BadRequestError('Cannot book appointments in the past');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext($1::text || $2))`,
      [doctor_id, date]
    );

    const doctor = await doctorService.getDoctorById(doctor_id);
    if (!doctor) throw new NotFoundError('Doctor not found');

    if (doctor.slot_duration && duration > doctor.slot_duration) {
      throw new BadRequestError(`Duration cannot exceed doctor's slot duration of ${doctor.slot_duration} minutes`);
    }

    const userResult = await client.query(
      'SELECT email, rut, phone, blocked_until FROM users WHERE id = $1',
      [user_id]
    );
    if (userResult.rows.length === 0) throw new NotFoundError('User not found');

    const user = userResult.rows[0];
    if (user.blocked_until && new Date(user.blocked_until) > new Date()) {
      throw new BadRequestError('Your account is blocked due to unconfirmed appointments. Please wait before booking again.');
    }

    const day = getDayOfWeek(date);

    const availability = await client.query(
      `SELECT start_time, end_time FROM doctor_availability
       WHERE doctor_id = $1 AND day_of_week = $2`,
      [doctor_id, day]
    );

    if (availability.rows.length === 0) throw new BadRequestError('Doctor not available on this day');

    const start = new Date(`1970-01-01T${time}`);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + duration);

    const isInsideAnyBlock = availability.rows.some((a: { start_time: string; end_time: string }) => {
      const startLimit = new Date(`1970-01-01T${a.start_time}`);
      const endLimit = new Date(`1970-01-01T${a.end_time}`);
      return start >= startLimit && end <= endLimit;
    });

    if (!isInsideAnyBlock) throw new BadRequestError('Outside doctor availability');

    const exceptions = await client.query(
      `SELECT * FROM doctor_exceptions WHERE doctor_id = $1 AND date = $2`,
      [doctor_id, date]
    );

    for (const ex of exceptions.rows) {
      if (ex.is_full_day) throw new BadRequestError('Doctor not available (full day blocked)');
      if (ex.start_time && ex.end_time) {
        const exStart = new Date(`1970-01-01T${ex.start_time}`);
        const exEnd = new Date(`1970-01-01T${ex.end_time}`);
        if (start < exEnd && end > exStart) throw new BadRequestError('Time blocked by doctor');
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

    if (overlap.rows.length > 0) throw new BadRequestError('This time slot is already booked');

    const confirmToken = jwt.sign(
      { user_id, doctor_id, date, time },
      getJWTSecret(),
      { expiresIn: '7d' }
    );

    const result = await client.query(
      `INSERT INTO bookings (doctor_id, user_id, date, time, duration, confirmation_token)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [doctor_id, user_id, date, time, duration, confirmToken]
    );

    await client.query('COMMIT');

    const booking = result.rows[0];

    sendEmail({
      to: user.email,
      subject: 'Confirma tu cita médica',
      html: bookingConfirmationTemplate({
        doctor: doctor.name,
        date,
        time,
        confirmToken,
        frontendUrl: process.env.FRONTEND_URL,
      }),
    }).catch((err: unknown) => logger.error('Email error (non-critical):', err));

    return booking;

  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const pgError = error as { code?: string };
    if (pgError.code === '23505') throw new BadRequestError('This time slot is already booked');
    if (pgError.code === '23503') throw new BadRequestError('Invalid doctor or user');
    throw error;
  } finally {
    client.release();
  }
};

export const getBookingsByUser = async (user_id: number, { page = 1, limit = 20 }: PaginationOptions = {}): Promise<BookingData> => {
  const offset = (page - 1) * limit;
  const result = await pool.query(`
    SELECT b.id, b.date, b.time, b.duration, b.status, b.confirmed,
           d.name AS doctor_name, d.specialty
    FROM bookings b
    JOIN doctors d ON b.doctor_id = d.id
    WHERE b.user_id = $1 AND b.status != 'cancelled'
    ORDER BY b.date, b.time
    LIMIT $2 OFFSET $3
  `, [user_id, limit, offset]);

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM bookings WHERE user_id = $1 AND status != 'cancelled'`,
    [user_id]
  );

  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  };
};

export const deleteBooking = async (booking_id: number, user_id: number): Promise<{ message: string }> => {
  if (!Number.isInteger(booking_id) || !Number.isInteger(user_id)) {
    throw new BadRequestError('Invalid booking id');
  }

  const result = await pool.query(
    `UPDATE bookings SET status = 'cancelled'
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [booking_id, user_id]
  );

  if (result.rows.length === 0) throw new NotFoundError('Booking not found or unauthorized');

  return { message: 'Booking cancelled successfully' };
};

export const getAvailableSlots = async (doctor_id: number, date: string): Promise<string[]> => {
  if (!doctor_id || !date) throw new BadRequestError('doctor_id and date are required');
  if (!isValidDate(date)) throw new BadRequestError('Invalid date format, use YYYY-MM-DD');

  const day = getDayOfWeek(date);

  const availabilityResult = await pool.query(
    `SELECT start_time, end_time FROM doctor_availability
     WHERE doctor_id = $1 AND day_of_week = $2 ORDER BY start_time`,
    [doctor_id, day]
  );

  if (availabilityResult.rows.length === 0) return [];

  const doctorResult = await pool.query(
    `SELECT slot_duration FROM doctors WHERE id = $1`,
    [doctor_id]
  );
  const duration = doctorResult.rows[0]?.slot_duration || 30;

  const addMinutes = (time: string, mins: number): string => {
    const d = new Date(`1970-01-01T${time}`);
    d.setMinutes(d.getMinutes() + mins);
    return d.toTimeString().slice(0, 5);
  };

  const slots: string[] = [];

  for (const block of availabilityResult.rows) {
    let current = block.start_time.slice(0, 5);
    while (true) {
      const next = addMinutes(current, duration);
      if (next > block.end_time.slice(0, 5)) break;
      slots.push(current);
      current = next;
    }
  }

  const booked = await pool.query(
    `SELECT time, duration FROM bookings WHERE doctor_id = $1 AND date = $2 AND status != 'cancelled'`,
    [doctor_id, date]
  );

  const exceptions = await pool.query(
    `SELECT * FROM doctor_exceptions WHERE doctor_id = $1 AND date = $2`,
    [doctor_id, date]
  );

  return slots.filter(slot => {
    const slotStart = new Date(`1970-01-01T${slot}`);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + duration);

    for (const ex of exceptions.rows) {
      if (ex.is_full_day) return false;
      if (ex.start_time && ex.end_time) {
        const exStart = new Date(`1970-01-01T${ex.start_time}`);
        const exEnd = new Date(`1970-01-01T${ex.end_time}`);
        if (slotStart < exEnd && slotEnd > exStart) return false;
      }
    }

    for (const b of booked.rows) {
      const bStart = new Date(`1970-01-01T${b.time}`);
      const bEnd = new Date(bStart);
      bEnd.setMinutes(bEnd.getMinutes() + b.duration);
      if (slotStart < bEnd && slotEnd > bStart) return false;
    }

    return true;
  });
};

export const getBookingsByDoctor = async (doctor_id: number, { page = 1, limit = 50 }: PaginationOptions = {}): Promise<BookingData> => {
  const offset = (page - 1) * limit;
  const result = await pool.query(`
    SELECT b.id, b.date, b.time, b.duration, b.status, b.confirmed,
           u.email AS patient_email,
           b.guest_name, b.guest_email, b.guest_phone, b.guest_rut
    FROM bookings b
    LEFT JOIN users u ON b.user_id = u.id
    WHERE b.doctor_id = $1 AND b.status != 'cancelled'
    ORDER BY b.date, b.time
    LIMIT $2 OFFSET $3
  `, [doctor_id, limit, offset]);

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM bookings WHERE doctor_id = $1 AND status != 'cancelled'`,
    [doctor_id]
  );

  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  };
};