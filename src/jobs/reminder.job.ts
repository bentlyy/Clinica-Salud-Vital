import cron from 'node-cron';
import { pool } from '../shared/db.js';
import { sendEmail } from '../shared/email.service.js';

interface BookingRow {
  id: number;
  date: string;
  time: string;
  email: string;
  user_id: number;
  doctor_name: string;
  confirmed: boolean;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const sendWithRetry = async (emailOptions: EmailOptions, attempts = 3): Promise<void> => {
  for (let i = 1; i <= attempts; i++) {
    try {
      await sendEmail(emailOptions);
      return;
    } catch (err) {
      if (i === attempts) throw err;
      await new Promise(r => setTimeout(r, 1000 * 2 ** i));
    }
  }
};

const sendReminders = async (intervalStart: string, intervalEnd: string, sentField: string, subjectLabel: string): Promise<void> => {
  const result = await pool.query(`
    SELECT b.id, b.date, b.time,
           COALESCE(u.email, b.guest_email) AS email,
           COALESCE(u.id, 0) AS user_id,
           d.name AS doctor_name,
           b.confirmed
    FROM bookings b
    LEFT JOIN users u ON b.user_id = u.id
    JOIN doctors d ON b.doctor_id = d.id
    WHERE b.${sentField} = FALSE
      AND b.status = 'pending'
      AND (b.confirmed = TRUE OR b.confirmed = FALSE)
      AND (b.date + b.time) BETWEEN NOW() + INTERVAL '${intervalStart}' AND NOW() + INTERVAL '${intervalEnd}'
  `);

  for (const booking of result.rows as BookingRow[]) {
    const needsConfirmation = !booking.confirmed;
    try {
      await sendWithRetry({
        to: booking.email,
        subject: needsConfirmation ? `Confirma tu cita: ${subjectLabel}` : subjectLabel,
        html: `
          <h3>Recordatorio de cita${needsConfirmation ? ' - Confirma tu cita' : ''}</h3>
          <p>Hola${booking.user_id > 0 ? '' : ', te recordamos tu cita:'}</p>
          <ul>
            <li><strong>Doctor:</strong> ${booking.doctor_name}</li>
            <li><strong>Fecha:</strong> ${booking.date}</li>
            <li><strong>Hora:</strong> ${booking.time}</li>
            ${needsConfirmation ? '<li><strong>IMPORTANTE:</strong> Tu cita aún no ha sido confirmada. Confírmala para evitar pérdida.</li>' : ''}
          </ul>
        `,
      });

      await pool.query(
        `UPDATE bookings SET ${sentField} = TRUE WHERE id = $1`,
        [booking.id]
      );
    } catch (err) {
      console.error(`Reminder failed for booking ${booking.id}:`, (err as Error).message);
    }
  }
};

export const startReminderJob = (): void => {
  cron.schedule('*/5 * * * *', async () => {
    console.log('Checking reminders...');
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
      console.error('Reminder job global error:', error);
    }
  });
};