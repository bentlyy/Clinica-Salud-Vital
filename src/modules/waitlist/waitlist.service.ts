import { pool } from '../../shared/db.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { enqueueJob } from '../../shared/queue.service.js';
import { createNotification } from '../notifications/notification.service.js';
import { toError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export interface WaitlistEntry {
  id: number;
  tenant_id: string;
  doctor_id: number;
  user_id: number;
  requested_date: string;
  status: string;
  notified_at: string | null;
  created_at: string;
  doctor_name?: string;
  patient_name?: string;
  patient_email?: string;
}

const WAITLIST_COLUMNS = `w.id, w.tenant_id, w.doctor_id, w.user_id, w.requested_date, w.status, w.notified_at, w.created_at,
  d.name AS doctor_name,
  u.name AS patient_name,
  u.email AS patient_email`;

const parseEntry = (row: Record<string, unknown>): WaitlistEntry => ({
  id: row.id as number,
  tenant_id: row.tenant_id as string,
  doctor_id: row.doctor_id as number,
  user_id: row.user_id as number,
  requested_date: row.requested_date as string,
  status: row.status as string,
  notified_at: (row.notified_at as string) ?? null,
  created_at: row.created_at as string,
  doctor_name: row.doctor_name as string | undefined,
  patient_name: row.patient_name as string | undefined,
  patient_email: row.patient_email as string | undefined,
});

export const joinWaitlist = async (
  userId: number,
  tenantId: string,
  payload: { doctor_id: number; requested_date: string },
): Promise<WaitlistEntry> => {
  const { doctor_id, requested_date } = payload;
  if (!doctor_id || !requested_date) throw new BadRequestError('doctor_id and requested_date are required');

  const doctor = await pool.query(
    'SELECT id FROM doctors WHERE id = $1 AND tenant_id = $2',
    [doctor_id, tenantId]
  );
  if (doctor.rows.length === 0) throw new NotFoundError('Doctor not found');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const reqDate = new Date(requested_date);
  if (reqDate < today) throw new BadRequestError('Cannot join waitlist for a past date');

  const result = await pool.query(
    `INSERT INTO waitlist (tenant_id, doctor_id, user_id, requested_date, status)
     VALUES ($1, $2, $3, $4, 'waiting')
     ON CONFLICT (doctor_id, user_id, requested_date) DO UPDATE SET status = 'waiting', notified_at = NULL
     RETURNING id, tenant_id, doctor_id, user_id, requested_date, status, notified_at, created_at`,
    [tenantId, doctor_id, userId, requested_date]
  );

  return parseEntry(result.rows[0]);
};

export const leaveWaitlist = async (entryId: number, userId: number, tenantId: string): Promise<void> => {
  const result = await pool.query(
    `DELETE FROM waitlist WHERE id = $1 AND user_id = $2 AND tenant_id = $3 AND status != 'booked'`,
    [entryId, userId, tenantId]
  );
  if (result.rowCount === 0) throw new NotFoundError('Waitlist entry not found');
};

export const listMyWaitlist = async (userId: number, tenantId: string): Promise<WaitlistEntry[]> => {
  const result = await pool.query(
    `SELECT ${WAITLIST_COLUMNS}
     FROM waitlist w
     JOIN doctors d ON w.doctor_id = d.id AND d.tenant_id = w.tenant_id
     JOIN users u ON w.user_id = u.id AND u.tenant_id = w.tenant_id
     WHERE w.user_id = $1 AND w.tenant_id = $2 AND w.status IN ('waiting', 'notified')
     ORDER BY w.requested_date ASC`,
    [userId, tenantId]
  );
  return result.rows.map(parseEntry);
};

export const listWaitlist = async (
  tenantId: string,
  filters: { doctor_id?: number; requested_date?: string; status?: string } = {},
): Promise<WaitlistEntry[]> => {
  const conditions = ['w.tenant_id = $1'];
  const params: (string | number)[] = [tenantId];
  if (filters.doctor_id) {
    params.push(filters.doctor_id);
    conditions.push(`w.doctor_id = $${params.length}`);
  }
  if (filters.requested_date) {
    params.push(filters.requested_date);
    conditions.push(`w.requested_date = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`w.status = $${params.length}`);
  }

  const result = await pool.query(
    `SELECT ${WAITLIST_COLUMNS}
     FROM waitlist w
     JOIN doctors d ON w.doctor_id = d.id AND d.tenant_id = w.tenant_id
     JOIN users u ON w.user_id = u.id AND u.tenant_id = w.tenant_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY w.requested_date ASC, w.created_at ASC`,
    params
  );
  return result.rows.map(parseEntry);
};

export const countWaitlistForSlot = async (doctorId: number, date: string, tenantId: string): Promise<number> => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM waitlist WHERE doctor_id = $1 AND requested_date = $2 AND tenant_id = $3 AND status = 'waiting'`,
    [doctorId, date, tenantId]
  );
  return result.rows[0]?.cnt ?? 0;
};

/**
 * Notify the oldest waiting user for a freed slot. Called after a booking is cancelled.
 * Marks the entry as 'notified' so it is not re-notified.
 */
export const notifyWaitlistForSlot = async (doctorId: number, date: string, tenantId: string): Promise<void> => {
  const result = await pool.query(
    `UPDATE waitlist
     SET status = 'notified', notified_at = NOW()
     WHERE id = (
       SELECT id FROM waitlist
       WHERE doctor_id = $1 AND requested_date = $2 AND tenant_id = $3 AND status = 'waiting'
       ORDER BY created_at ASC LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, user_id`,
    [doctorId, date, tenantId]
  );
  if (result.rows.length === 0) return;

  const entry = result.rows[0] as { id: number; user_id: number };
  const userResult = await pool.query(
    `SELECT u.email, d.name AS doctor_name FROM users u
     JOIN waitlist w ON w.user_id = u.id AND u.tenant_id = w.tenant_id
     JOIN doctors d ON w.doctor_id = d.id AND d.tenant_id = w.tenant_id
     WHERE w.id = $1 AND w.tenant_id = $2`,
    [entry.id, tenantId]
  );
  const user = userResult.rows[0];
  if (!user?.email) return;

  enqueueJob('email:send', {
    type: 'waitlist-slot-available',
    to: user.email,
    subject: '¡Hay un horario disponible! - Vitaria',
    html: `
      <h2>Horario disponible</h2>
      <p>Se ha liberado un horario con el Dr./Dra. ${String(user.doctor_name)} para el ${date}.</p>
      <p style="text-align:center;">
        <a href="${process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173'}/bookings">Reservar ahora</a>
      </p>
      <p>Si no puedes asistir, puedes ignorar este mensaje.</p>
    `,
    tenantId,
  }).catch((err) => {
    logger.error('Error encolando email de waitlist:', { error: toError(err).message });
  });

  void createNotification({
    tenant_id: tenantId,
    user_id: entry.user_id,
    type: 'success',
    title: 'Horario disponible',
    message: `Se liberó un horario con el Dr./Dra. ${String(user.doctor_name)} para el ${date}. ¡Reserva antes de que se ocupe!`,
    link: '/bookings',
  }).catch((err) => {
    logger.error('Error creando notificación in-app de waitlist:', { user_id: entry.user_id, error: toError(err).message });
  });
};
