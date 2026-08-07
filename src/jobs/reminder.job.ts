import cron from 'node-cron';
import { pool } from '../shared/db.js';
import { sendEmail } from '../shared/email.service.js';
import { escapeHtml } from '../shared/escape.js';
import { logger } from '../utils/logger.js';
import { BadRequestError } from '../utils/errors.js';

interface BookingRow {
  id: number;
  date: string;
  time: string;
  email: string;
  user_id: number;
  doctor_name: string;
  confirmed: boolean;
  confirmation_token: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const VALID_SENT_FIELDS = ['reminder_1h_sent', 'reminder_24h_sent'];

const sendWithRetry = async (emailOptions: EmailOptions, attempts = 3): Promise<void> => {
  for (let i = 1; i <= attempts; i++) {
    const result = await sendEmail(emailOptions);
    if (result.sent) return;
    if (i === attempts) throw new Error(result.error);
    await new Promise(r => setTimeout(r, 1000 * 2 ** i));
  }
};

export const sendReminders = async (intervalStart: string, intervalEnd: string, sentField: string, subjectLabel: string): Promise<void> => {
  if (!VALID_SENT_FIELDS.includes(sentField)) {
    throw new BadRequestError(`Invalid sentField: ${sentField}`);
  }

  const result = await pool.query(`
    SELECT b.id, b.date, b.time,
           COALESCE(u.email, b.guest_email) AS email,
           COALESCE(u.id, 0) AS user_id,
           d.name AS doctor_name,
           b.confirmed,
           b.confirmation_token
    FROM bookings b
    LEFT JOIN users u ON b.user_id = u.id
    JOIN doctors d ON b.doctor_id = d.id
    WHERE b.${sentField} = FALSE
      AND b.status = 'pending'
      AND (b.confirmed = TRUE OR b.confirmed = FALSE)
      AND b.tenant_id IS NOT NULL
      AND (b.date + b.time) BETWEEN NOW() + INTERVAL '1 minutes' * $1 AND NOW() + INTERVAL '1 minutes' * $2
  `, [parseIntervalToMinutes(intervalStart), parseIntervalToMinutes(intervalEnd)]);

  for (const booking of result.rows as BookingRow[]) {
    const needsConfirmation = !booking.confirmed;
    const frontendUrl = process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173';
    const confirmUrl = booking.confirmation_token
      ? `${frontendUrl}/confirm/${encodeURIComponent(booking.confirmation_token)}`
      : null;
    try {
      await sendWithRetry({
        to: booking.email,
        subject: needsConfirmation ? `Confirma tu cita: ${subjectLabel}` : subjectLabel,
        html: `
          <h3>Recordatorio de cita${needsConfirmation ? ' - Confirma tu cita' : ''}</h3>
          <p>Hola${booking.user_id > 0 ? '' : ', te recordamos tu cita:'}</p>
          <ul>
            <li><strong>Doctor:</strong> ${escapeHtml(booking.doctor_name)}</li>
            <li><strong>Fecha:</strong> ${escapeHtml(booking.date)}</li>
            <li><strong>Hora:</strong> ${escapeHtml(booking.time)}</li>
            ${needsConfirmation ? '<li><strong>IMPORTANTE:</strong> Tu cita a\u00fan no ha sido confirmada. Conf\u00edrmala para evitar p\u00e9rdida.</li>' : ''}
          </ul>
          ${confirmUrl ? `<p style="margin-top:16px;"><a href="${escapeHtml(confirmUrl)}" style="display:inline-block;padding:10px 24px;background-color:#1976d2;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Confirmar cita</a></p>` : ''}
        `,
      });

      await pool.query(
        `UPDATE bookings SET ${sentField} = TRUE WHERE id = $1`,
        [booking.id]
      );
    } catch (err) {
      logger.error(`Reminder failed for booking ${booking.id}:`, err);
    }
  }
};

export const parseIntervalToMinutes = (interval: string): number => {
  const match = interval.match(/^(\d+)\s*(hours?|minutes?|h|m)$/i);
  if (!match) return 0;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith('h')) return value * 60;
  return value;
};

export const startReminderJob = (): void => {
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Checking reminders...');
    try {
      await sendReminders(
        '55 minutes',
        '65 minutes',
        'reminder_1h_sent',
        'Recordatorio: tienes una cita en 1 hora'
      );
      await sendReminders(
        '23 hours',
        '25 hours',
        'reminder_24h_sent',
        'Recordatorio: tienes una cita mañana'
      );
    } catch (error) {
      logger.error('Reminder job global error:', error);
    }
  });
};