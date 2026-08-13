import { pool } from './db.js';
import { BadRequestError } from '../utils/errors.js';
import { E } from '../utils/error-codes.js';
import { getDayOfWeek } from './date.js';

export interface TimeBlock {
  start_time: string;
  end_time: string;
}

export interface SlotOverlapOptions {
  doctorId: number;
  date: string;
  time: string;
  duration: number;
  tenantId: string;
  client?: { query: typeof pool.query };
  excludeBookingId?: number;
}

export const checkHolidayBlock = async (
  date: string,
  tenantId: string,
  db: { query: typeof pool.query } = pool,
): Promise<void> => {
  const result = await db.query(
    'SELECT name FROM clinic_holidays WHERE holiday_date = $1 AND tenant_id = $2',
    [date, tenantId]
  );
  if (result.rows.length > 0) {
    throw new BadRequestError(`No hay disponibilidad: la clínica está cerrada el ${date}`);
  }
};

export const checkDoctorAvailability = async (
  doctorId: number,
  date: string,
  time: string,
  duration: number,
  db: { query: typeof pool.query } = pool,
  tenantId: string
): Promise<void> => {
  const day = getDayOfWeek(date);

  const availability = await db.query(
    `SELECT start_time, end_time FROM doctor_availability
     WHERE doctor_id = $1 AND day_of_week = $2 AND tenant_id = $3`,
    [doctorId, day, tenantId]
  );

  if (availability.rows.length === 0) {
    throw new BadRequestError('Doctor not available on this day');
  }

  const start = new Date(`1970-01-01T${time}`);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + duration);

  const isInsideAnyBlock = availability.rows.some((a: TimeBlock) => {
    const startLimit = new Date(`1970-01-01T${a.start_time}`);
    const endLimit = new Date(`1970-01-01T${a.end_time}`);
    return start >= startLimit && end <= endLimit;
  });

  if (!isInsideAnyBlock) throw new BadRequestError('Outside doctor availability');
};

export const checkDoctorExceptions = async (
  doctorId: number,
  date: string,
  time: string,
  duration: number,
  db: { query: typeof pool.query } = pool,
  tenantId: string
): Promise<void> => {
  const exceptions = await db.query(
    'SELECT * FROM doctor_exceptions WHERE doctor_id = $1 AND date = $2 AND tenant_id = $3',
    [doctorId, date, tenantId]
  );

  const start = new Date(`1970-01-01T${time}`);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + duration);

  for (const ex of exceptions.rows) {
    if (ex.is_full_day) throw new BadRequestError('Doctor not available (full day blocked)');
    if (ex.start_time && ex.end_time) {
      const exStart = new Date(`1970-01-01T${ex.start_time}`);
      const exEnd = new Date(`1970-01-01T${ex.end_time}`);
      if (start < exEnd && end > exStart) throw new BadRequestError('Time blocked by doctor exception');
    }
  }
};

export const checkSlotOverlap = async (
  doctorId: number,
  date: string,
  time: string,
  duration: number,
  db: { query: typeof pool.query } = pool,
  tenantId: string,
  excludeBookingId?: number,
): Promise<void> => {
  const overlap = await db.query(
    `SELECT 1 FROM bookings
     WHERE doctor_id = $1 AND date = $2 AND status != 'cancelled'
     AND tenant_id = $5
     AND ($6::int IS NULL OR id != $6)
     AND (
       (time <= $3 AND (time + (duration || ' minutes')::interval) > $3)
       OR ($3 <= time AND ($3::time + ($4 || ' minutes')::interval) > time)
     )`,
    [doctorId, date, time, duration, tenantId, excludeBookingId ?? null]
  );

  if (overlap.rows.length > 0) throw new BadRequestError(E.BOOKING_SLOT_ALREADY_BOOKED);
};

export const validateBookingSlot = async (opts: SlotOverlapOptions): Promise<void> => {
  const db = opts.client || pool;
  await checkHolidayBlock(opts.date, opts.tenantId, db);
  await checkDoctorAvailability(opts.doctorId, opts.date, opts.time, opts.duration, db, opts.tenantId);
  await checkDoctorExceptions(opts.doctorId, opts.date, opts.time, opts.duration, db, opts.tenantId);
  await checkSlotOverlap(opts.doctorId, opts.date, opts.time, opts.duration, db, opts.tenantId, opts.excludeBookingId);
};
