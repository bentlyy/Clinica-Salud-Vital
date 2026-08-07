import { pool } from '../../shared/db.js';
import * as doctorService from '../doctor/doctor.service.js';
import { bookingConfirmationTemplate } from './booking.email.js';
import { enqueueJob } from '../../shared/queue.service.js';
import { jwtManager } from '../../shared/jwt.service.js';
import { BadRequestError, NotFoundError, toError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { logger } from '../../utils/logger.js';
import { isValidDate, isValidTime, getDayOfWeek } from '../../shared/date.js';
import { validateBookingSlot } from '../../shared/booking-utils.js';
import { recordBookingStatusChange } from '../../shared/booking-history.js';
import { PaginationParams, PaginatedResponse } from '../../types/index.js';

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

export const getAllBookings = async ({ page = 1, limit = 100, status }: Partial<PaginationParams & { status?: string }> = {}, tenantId?: string): Promise<PaginatedResponse<unknown>> => {
  const safePage = Math.max(1, Number.isInteger(page) ? page : 1);
  const safeLimit = Math.max(1, Math.min(100, Number.isInteger(limit) ? limit : 100));
  const offset = (safePage - 1) * safeLimit;
  const params: (string | number)[] = [safeLimit, offset];

  let whereClause = '';
  if (tenantId !== undefined) {
    whereClause = 'WHERE b.tenant_id = $3';
    params.push(tenantId);
  }
  if (status) {
    whereClause = whereClause
      ? `${whereClause} AND b.status = $4`
      : 'WHERE b.status = $3';
    params.push(status);
  }

  const result = await pool.query(`
    SELECT b.id, b.date, b.time, b.duration, b.status, b.confirmed,
           d.name AS doctor_name, d.specialty,
           u.name AS patient_name, u.rut AS patient_rut, u.email AS patient_email,
           ch.reason AS cancel_reason, ch.created_at AS cancelled_at
    FROM bookings b
    JOIN doctors d ON b.doctor_id = d.id AND d.tenant_id = b.tenant_id
    LEFT JOIN users u ON b.user_id = u.id AND u.tenant_id = b.tenant_id
    LEFT JOIN LATERAL (
      SELECT reason, created_at
      FROM booking_status_history
      WHERE booking_id = b.id AND to_status = 'cancelled'
      ORDER BY created_at DESC LIMIT 1
    ) ch ON true
    ${whereClause}
    ORDER BY b.date DESC, b.time
    LIMIT $1 OFFSET $2
  `, params);

  const countConditions: string[] = [];
  const countParams: (string | number)[] = [];
  if (tenantId !== undefined) {
    countConditions.push('tenant_id = $1');
    countParams.push(tenantId);
  }
  if (status) {
    countConditions.push(`status = $${countParams.length + 1}`);
    countParams.push(status);
  }
  const countQuery = countConditions.length > 0
    ? `SELECT COUNT(*) FROM bookings WHERE ${countConditions.join(' AND ')}`
    : 'SELECT COUNT(*) FROM bookings';
  const countResult = await pool.query(countQuery, countParams);

  return {
    data: result.rows,
    total: parseInt(countResult.rows[0].count),
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(parseInt(countResult.rows[0].count) / safeLimit)
  };
};

export const createBooking = async ({ doctor_id, user_id, date, time, duration = 30 }: BookingInput, tenantId: string): Promise<unknown> => {
  if (!doctor_id || !user_id || !date || !time) throw new BadRequestError(E.BOOKING_MISSING_FIELDS);
  if (!isValidDate(date)) throw new BadRequestError(E.BOOKING_INVALID_DATE);
  if (!isValidTime(time)) throw new BadRequestError(E.BOOKING_INVALID_TIME);
  if (duration <= 0 || duration > 480) throw new BadRequestError(E.BOOKING_INVALID_DURATION);
  if (duration % 5 !== 0) throw new BadRequestError(E.BOOKING_DURATION_NOT_MULTIPLE);

  const bookingDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (bookingDate < today) throw new BadRequestError(E.BOOKING_PAST_DATE);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `SELECT pg_advisory_xact_lock($1::bigint, (hashtext($2::text)::bit(32)::bigint))`,
      [doctor_id, date]
    );

    const doctor = await doctorService.getDoctorById(doctor_id, tenantId);
    if (!doctor) throw new NotFoundError(E.BOOKING_DOCTOR_NOT_FOUND);

    if (doctor.slot_duration && duration > doctor.slot_duration) {
      throw new BadRequestError(E.BOOKING_SLOT_EXCEEDS_DOCTOR, 'Duration cannot exceed doctor\'s slot duration of ' + doctor.slot_duration + ' minutes');
    }

    const userResult = await client.query(
      'SELECT email, rut, phone, blocked_until FROM users WHERE id = $1 AND tenant_id = $2',
      [user_id, tenantId]
    );
    if (userResult.rows.length === 0) throw new NotFoundError(E.BOOKING_USER_NOT_FOUND);

    const user = userResult.rows[0];
    if (user.blocked_until && new Date(user.blocked_until) > new Date()) {
      throw new BadRequestError(E.BOOKING_USER_BLOCKED);
    }

    await validateBookingSlot({ doctorId: doctor_id, date, time, duration, client, tenantId });

    const confirmToken = jwtManager.signInvite(
      { user_id, doctor_id, date, time },
      '7d'
    );

    const result = await client.query(
      `INSERT INTO bookings (doctor_id, user_id, date, time, duration, confirmed, confirmation_token, tenant_id)
       VALUES ($1, $2, $3, $4, $5, true, $6, $7) RETURNING *`,
      [doctor_id, user_id, date, time, duration, confirmToken, tenantId]
    );
    const booking = result.rows[0];

    await recordBookingStatusChange(
      booking.id,
      {
        toStatus: 'pending',
        actorType: 'user',
        changedByUserId: user_id,
        changedByRole: 'patient',
        notes: 'Cita agendada',
      },
      client
    );

    await client.query('COMMIT');

    enqueueJob('email:send', {
      type: 'booking-confirmation',
      to: user.email,
      subject: 'Cita agendada - Salud Vital',
      html: bookingConfirmationTemplate({
        doctor: doctor.name,
        date,
        time,
        confirmToken,
        frontendUrl: process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173',
      }),
      tenantId,
    }).catch((err) => {
      logger.error('Error encolando email de confirmación:', { to: user.email, error: toError(err).message });
    });

    return booking;

  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const pgError = error as { code?: string };
    if (pgError.code === '23505') throw new BadRequestError(E.BOOKING_SLOT_ALREADY_BOOKED);
    if (pgError.code === '23503') throw new BadRequestError(E.BOOKING_INVALID_DOCTOR_USER);
    throw error;
  } finally {
    client.release();
  }
};

export const getBookingsByUser = async (user_id: number, { page = 1, limit = 20, status }: Partial<PaginationParams & { status?: string }> = {}, tenantId: string): Promise<PaginatedResponse<unknown>> => {
  const safePage = Math.max(1, Number.isInteger(page) ? page : 1);
  const safeLimit = Math.max(1, Math.min(100, Number.isInteger(limit) ? limit : 20));
  const offset = (safePage - 1) * safeLimit;
  const params: (string | number)[] = [user_id, safeLimit, offset, tenantId];
  let statusClause = '';
  if (status) {
    statusClause = ' AND b.status = $5';
    params.push(status);
  }

  const result = await pool.query(`
    SELECT b.id, b.date, b.time, b.duration, b.status, b.confirmed,
           d.name AS doctor_name, d.specialty,
           ch.reason AS cancel_reason, ch.created_at AS cancelled_at
    FROM bookings b
    JOIN doctors d ON b.doctor_id = d.id AND d.tenant_id = b.tenant_id
    LEFT JOIN LATERAL (
      SELECT reason, created_at
      FROM booking_status_history
      WHERE booking_id = b.id AND to_status = 'cancelled'
      ORDER BY created_at DESC LIMIT 1
    ) ch ON true
    WHERE b.user_id = $1 AND b.tenant_id = $4${statusClause}
    ORDER BY b.date, b.time
    LIMIT $2 OFFSET $3
  `, params);

  const countParams: (string | number)[] = [user_id, tenantId];
  let countStatusClause = '';
  if (status) {
    countStatusClause = ' AND status = $3';
    countParams.push(status);
  }
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM bookings WHERE user_id = $1 AND tenant_id = $2${countStatusClause}`,
    countParams
  );

  return {
    data: result.rows,
    total: parseInt(countResult.rows[0].count),
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(parseInt(countResult.rows[0].count) / safeLimit)
  };
};

export const cancelBooking = async (booking_id: number, user_id: number, tenantId: string, reason?: string): Promise<{ message: string }> => {
  if (!Number.isInteger(booking_id) || !Number.isInteger(user_id)) {
    throw new BadRequestError(E.BOOKING_INVALID_ID);
  }

  const existing = await pool.query(
    'SELECT id, status FROM bookings WHERE id = $1 AND user_id = $2 AND tenant_id = $3',
    [booking_id, user_id, tenantId]
  );

  if (existing.rows.length === 0) throw new NotFoundError(E.BOOKING_NOT_FOUND);
  const fromStatus = existing.rows[0].status as string;

  const result = await pool.query(
    `UPDATE bookings SET status = 'cancelled'
     WHERE id = $1 AND user_id = $2 AND tenant_id = $3
     RETURNING *`,
    [booking_id, user_id, tenantId]
  );

  if (result.rows.length === 0) throw new NotFoundError(E.BOOKING_NOT_FOUND);

  await recordBookingStatusChange(booking_id, {
    toStatus: 'cancelled',
    fromStatus,
    actorType: 'user',
    changedByUserId: user_id,
    reason,
  });

  return { message: 'Booking cancelled successfully' };
};

export const confirmBooking = async (token: string, tenantId: string): Promise<{ confirmed: boolean; alreadyConfirmed: boolean }> => {
  if (!token) throw new BadRequestError(E.BOOKING_MISSING_FIELDS);

  const payload = jwtManager.verify<{ tenant_id?: string }>(token);
  if (!payload) throw new BadRequestError(E.AUTH_TOKEN_INVALID_EXPIRED);

  if (payload.tenant_id && payload.tenant_id !== tenantId) {
    throw new NotFoundError(E.BOOKING_NOT_FOUND);
  }

  const result = await pool.query(
    `UPDATE bookings SET confirmed = TRUE
     WHERE confirmation_token = $1 AND tenant_id = $2
       AND confirmed = FALSE
     RETURNING id`,
    [token, tenantId]
  );

  if (result.rows.length > 0) {
    await recordBookingStatusChange(Number(result.rows[0].id), {
      toStatus: 'confirmed',
      actorType: payload.user_id ? 'user' : 'guest',
      changedByUserId: payload.user_id ?? null,
      changedByRole: 'patient',
      notes: 'Cita confirmada',
    });
    return { confirmed: true, alreadyConfirmed: false };
  }

  const existing = await pool.query(
    'SELECT confirmed FROM bookings WHERE confirmation_token = $1 AND tenant_id = $2',
    [token, tenantId]
  );

  if (existing.rows.length === 0) {
    throw new NotFoundError(E.BOOKING_NOT_FOUND);
  }

  return { confirmed: true, alreadyConfirmed: existing.rows[0].confirmed !== false };
};

export const getAvailableSlots = async (doctor_id: number, date: string, tenantId: string): Promise<string[]> => {
  if (!doctor_id || !date) throw new BadRequestError(E.BOOKING_MISSING_FIELDS);
  if (!isValidDate(date)) throw new BadRequestError(E.BOOKING_INVALID_DATE);

  const day = getDayOfWeek(date);

  const client = await pool.connect();
  try {
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');

    const availabilityResult = await client.query(
      `SELECT start_time, end_time FROM doctor_availability
       WHERE doctor_id = $1 AND day_of_week = $2 AND tenant_id = $3 ORDER BY start_time`,
      [doctor_id, day, tenantId]
    );

    if (availabilityResult.rows.length === 0) return [];

    const doctorResult = await client.query(
      'SELECT slot_duration FROM doctors WHERE id = $1 AND tenant_id = $2',
      [doctor_id, tenantId]
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

    const booked = await client.query(
      `SELECT time, duration FROM bookings WHERE doctor_id = $1 AND date = $2 AND status != 'cancelled' AND tenant_id = $3`,
      [doctor_id, date, tenantId]
    );

    const exceptions = await client.query(
      'SELECT * FROM doctor_exceptions WHERE doctor_id = $1 AND date = $2 AND tenant_id = $3',
      [doctor_id, date, tenantId]
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
  } finally {
    client.release();
  }
};

export const getDailyBookingDensity = async (
  doctorId: number,
  startDate: string,
  endDate: string,
  tenantId: string
): Promise<{ date: string; count: number }[]> => {
  const result = await pool.query(
    `SELECT date, COUNT(*)::int as count
     FROM bookings
     WHERE doctor_id = $1 AND date >= $2 AND date <= $3 AND status != 'cancelled' AND tenant_id = $4
     GROUP BY date
     ORDER BY date`,
    [doctorId, startDate, endDate, tenantId]
  );
  return result.rows;
};

export const getBookingsByDoctor = async (doctor_id: number, { page = 1, limit = 50, status }: Partial<PaginationParams & { status?: string }> = {}, tenantId: string): Promise<PaginatedResponse<unknown>> => {
  const safePage = Math.max(1, Number.isInteger(page) ? page : 1);
  const safeLimit = Math.max(1, Math.min(100, Number.isInteger(limit) ? limit : 50));
  const offset = (safePage - 1) * safeLimit;
  const params: (string | number)[] = [doctor_id, safeLimit, offset, tenantId];
  let statusClause = '';
  if (status) {
    statusClause = ' AND b.status = $5';
    params.push(status);
  }

  const result = await pool.query(`
    SELECT b.id, b.date, b.time, b.duration, b.status, b.confirmed,
           COALESCE(u.name, '') AS patient_name,
           u.email AS patient_email,
           u.rut AS patient_rut,
           b.guest_name, b.guest_email, b.guest_phone, b.guest_rut,
           d.name AS doctor_name,
           ch.reason AS cancel_reason, ch.created_at AS cancelled_at
    FROM bookings b
    LEFT JOIN users u ON b.user_id = u.id AND u.tenant_id = b.tenant_id
    LEFT JOIN doctors doc ON b.doctor_id = doc.id AND doc.tenant_id = b.tenant_id
    LEFT JOIN users d ON doc.user_id = d.id AND d.tenant_id = b.tenant_id
    LEFT JOIN LATERAL (
      SELECT reason, created_at
      FROM booking_status_history
      WHERE booking_id = b.id AND to_status = 'cancelled'
      ORDER BY created_at DESC LIMIT 1
    ) ch ON true
    WHERE b.doctor_id = $1 AND b.tenant_id = $4${statusClause}
    ORDER BY b.date, b.time
    LIMIT $2 OFFSET $3
  `, params);

  const countParams: (string | number)[] = [doctor_id, tenantId];
  let countStatusClause = '';
  if (status) {
    countStatusClause = ' AND status = $3';
    countParams.push(status);
  }
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM bookings WHERE doctor_id = $1 AND tenant_id = $2${countStatusClause}`,
    countParams
  );

  return {
    data: result.rows,
    total: parseInt(countResult.rows[0].count),
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(parseInt(countResult.rows[0].count) / safeLimit)
  };
};
