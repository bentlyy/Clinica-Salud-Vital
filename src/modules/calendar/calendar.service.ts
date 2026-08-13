import { pool } from '../../shared/db.js';
import { NotFoundError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { getDayOfWeek } from '../../shared/date.js';
import { buildCalendar, buildVEvent, formatDateUTC } from './ics.util.js';

const DAYS_FORWARD = 90;

const pad = (n: number): string => String(n).padStart(2, '0');

const toDateString = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toISO = (value: string | Date): string => {
  if (value instanceof Date) return toDateString(value);
  return String(value).slice(0, 10);
};

const toUTCDate = (dateStr: string, timeStr: string): Date => new Date(`${dateStr}T${timeStr}Z`);

const addMinutesUTC = (date: Date, minutes: number): Date => new Date(date.getTime() + minutes * 60000);

export const exportDoctorCalendarICS = async (
  doctorId: number,
  tenantId: string,
  opts?: { from?: string; to?: string }
): Promise<{ content: string; filename: string }> => {
  const doctorResult = await pool.query(
    'SELECT id, name FROM doctors WHERE id = $1 AND tenant_id = $2',
    [doctorId, tenantId]
  );
  if (doctorResult.rows.length === 0) {
    throw new NotFoundError(E.AVAILABILITY_DOCTOR_NOT_FOUND);
  }
  const doctor = doctorResult.rows[0];

  const fromStr = opts?.from || toDateString(new Date());
  const toStr = opts?.to || toDateString(new Date(Date.now() + DAYS_FORWARD * 24 * 60 * 60 * 1000));

  const [availabilityResult, exceptionsResult, bookingsResult] = await Promise.all([
    pool.query(
      `SELECT id, day_of_week, start_time, end_time FROM doctor_availability
       WHERE doctor_id = $1 AND tenant_id = $2
       ORDER BY day_of_week, start_time`,
      [doctorId, tenantId]
    ),
    pool.query(
      `SELECT date, is_full_day FROM doctor_exceptions
       WHERE doctor_id = $1 AND tenant_id = $2 AND date >= $3 AND date <= $4`,
      [doctorId, tenantId, fromStr, toStr]
    ),
    pool.query(
      `SELECT b.id, b.date, b.time, b.duration, b.status,
              COALESCE(u.name, b.guest_name, '') AS patient_name,
              COALESCE(u.rut, b.guest_rut, '') AS patient_rut,
              d.name AS doctor_name
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id AND u.tenant_id = b.tenant_id
       LEFT JOIN doctors d ON b.doctor_id = d.id AND d.tenant_id = b.tenant_id
       WHERE b.doctor_id = $1 AND b.tenant_id = $2 AND b.status != 'cancelled'
         AND b.date >= $3 AND b.date <= $4
       ORDER BY b.date, b.time`,
      [doctorId, tenantId, fromStr, toStr]
    ),
  ]);

  const exceptedDates = new Set<string>();
  for (const ex of exceptionsResult.rows) exceptedDates.add(toISO(ex.date));

  const events: string[] = [];

  for (const block of availabilityResult.rows) {
    const dayOfWeek = Number(block.day_of_week);
    let cursor = new Date(`${fromStr}T00:00:00`);
    const end = new Date(`${toStr}T00:00:00`);
    while (cursor <= end) {
      const dayStr = toDateString(cursor);
      if (getDayOfWeek(dayStr) === dayOfWeek && !exceptedDates.has(dayStr)) {
        events.push(
          buildVEvent({
            uid: `avail-${block.id}-${dayStr}`,
            dtstart: formatDateUTC(toUTCDate(dayStr, block.start_time)),
            dtend: formatDateUTC(toUTCDate(dayStr, block.end_time)),
            summary: `Disponibilidad - ${doctor.name}`,
          })
        );
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  for (const booking of bookingsResult.rows) {
    if (booking.status === 'cancelled') continue;
    const duration = Number(booking.duration) || 30;
    const dtstart = toUTCDate(toISO(booking.date), booking.time);
    events.push(
      buildVEvent({
        uid: `booking-${booking.id}`,
        dtstart: formatDateUTC(dtstart),
        dtend: formatDateUTC(addMinutesUTC(dtstart, duration)),
        summary: `Cita: ${booking.patient_name}`,
        description: `Doctor: ${booking.doctor_name} - Paciente: ${booking.patient_name} - RUT: ${booking.patient_rut}`,
      })
    );
  }

  return {
    content: buildCalendar(events),
    filename: `doctor-${doctorId}-calendar.ics`,
  };
};
