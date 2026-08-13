import { pool } from '../../shared/db.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { enqueueJob } from '../../shared/queue.service.js';
import { toError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { recordBookingStatusChange } from '../../shared/booking-history.js';
import { notifyWaitlistForSlot } from '../waitlist/waitlist.service.js';

export interface Holiday {
  id: number;
  tenant_id: string;
  holiday_date: string;
  name: string;
  notice_days: number;
  cancel_bookings: boolean;
  created_by: number | null;
  created_at: string;
}

const HOLIDAY_SELECT = `id, tenant_id, holiday_date, name, notice_days, cancel_bookings, created_by, created_at`;

const parseHoliday = (row: Record<string, unknown>): Holiday => ({
  id: row.id as number,
  tenant_id: row.tenant_id as string,
  holiday_date: row.holiday_date as string,
  name: row.name as string,
  notice_days: row.notice_days as number,
  cancel_bookings: row.cancel_bookings as boolean,
  created_by: (row.created_by as number) ?? null,
  created_at: row.created_at as string,
});

export const listHolidays = async (tenantId: string): Promise<Holiday[]> => {
  const result = await pool.query(
    `SELECT ${HOLIDAY_SELECT} FROM clinic_holidays WHERE tenant_id = $1 ORDER BY holiday_date ASC`,
    [tenantId]
  );
  return result.rows.map(parseHoliday);
};

export const getHolidayById = async (id: number, tenantId: string): Promise<Holiday | null> => {
  const result = await pool.query(
    `SELECT ${HOLIDAY_SELECT} FROM clinic_holidays WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  return result.rows.length ? parseHoliday(result.rows[0]) : null;
};

export interface CreateHolidayResult {
  holiday: Holiday;
  cancelled_bookings: number;
  short_notice: boolean;
}

export const createHoliday = async (
  createdBy: number,
  tenantId: string,
  payload: { holiday_date: string; name: string; notice_days?: number; cancel_bookings?: boolean },
): Promise<CreateHolidayResult> => {
  const { holiday_date, name, notice_days = 15, cancel_bookings = true } = payload;
  if (!holiday_date) throw new BadRequestError('holiday_date is required');
  if (!name || !name.trim()) throw new BadRequestError('name is required');

  const dupResult = await pool.query(
    'SELECT id FROM clinic_holidays WHERE tenant_id = $1 AND holiday_date = $2',
    [tenantId, holiday_date]
  );
  if (dupResult.rows.length > 0) throw new BadRequestError('Ya existe un feriado para esa fecha');

  const insert = await pool.query(
    `INSERT INTO clinic_holidays (tenant_id, holiday_date, name, notice_days, cancel_bookings, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${HOLIDAY_SELECT}`,
    [tenantId, holiday_date, name.trim(), notice_days, cancel_bookings, createdBy]
  );
  const holiday = parseHoliday(insert.rows[0]);

  let cancelledBookings = 0;
  let shortNotice = false;

  if (cancel_bookings) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(holiday_date);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    shortNotice = diffDays < notice_days;

    const bookingResult = await pool.query(
      `SELECT b.id, b.doctor_id, b.user_id, u.email AS patient_email, u.name AS patient_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id AND u.tenant_id = b.tenant_id
       WHERE b.tenant_id = $1 AND b.date = $2 AND b.status != 'cancelled'`,
      [tenantId, holiday_date]
    );

    for (const b of bookingResult.rows) {
      await pool.query(
        `UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND tenant_id = $2`,
        [b.id, tenantId]
      );
      await recordBookingStatusChange(b.id, {
        toStatus: 'cancelled',
        fromStatus: 'confirmed',
        actorType: 'admin',
        changedByUserId: createdBy,
        reason: `Feriado clínico: ${name}`,
      });
      cancelledBookings++;

      if (b.patient_email) {
        enqueueJob('email:send', {
          type: 'booking-cancelled-holiday',
          to: b.patient_email,
          subject: 'Cita cancelada - Feriado de la clínica',
          html: `
            <h2>Cita cancelada</h2>
            <p>Hola ${String(b.patient_name)},</p>
            <p>Tu cita del ${holiday_date} ha sido cancelada porque la clínica estará cerrada por feriado (${name}).</p>
            <p>Por favor, reprograma tu cita desde la plataforma.</p>
          `,
          tenantId,
        }).catch((err) => logger.error('Error encolando email de cancelación por feriado:', { error: toError(err).message }));
      }

      void notifyWaitlistForSlot(b.doctor_id, holiday_date, tenantId).catch((err) =>
        logger.error('Error notificando waitlist por feriado:', { error: toError(err).message })
      );
    }
  }

  return { holiday, cancelled_bookings: cancelledBookings, short_notice: shortNotice };
};

export const deleteHoliday = async (id: number, tenantId: string): Promise<void> => {
  const result = await pool.query(
    'DELETE FROM clinic_holidays WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [id, tenantId]
  );
  if (result.rowCount === 0) throw new NotFoundError('Holiday not found');
};
