import cron from 'node-cron';
import { pool } from '../shared/db.js';
import { sendEmail } from '../shared/email.service.js';

// ✅ Retry helper — try up to `attempts` times before giving up
const sendWithRetry = async (emailOptions, attempts = 3) => {
  for (let i = 1; i <= attempts; i++) {
    try {
      await sendEmail(emailOptions);
      return;
    } catch (err) {
      if (i === attempts) throw err;
      // Exponential backoff: 2s, 4s, 8s ...
      await new Promise(r => setTimeout(r, 1000 * 2 ** i));
    }
  }
};

const sendReminders = async (windowStart, windowEnd, sentField, subjectLabel) => {
  const result = await pool.query(`
    SELECT b.id, b.date, b.time, u.email, d.name AS doctor_name
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    JOIN doctors d ON b.doctor_id = d.id
    WHERE b.${sentField} = FALSE
      AND (b.date + b.time) BETWEEN NOW() + $1 AND NOW() + $2
  `, [windowStart, windowEnd]);

  for (const booking of result.rows) {
    try {
      await sendWithRetry({
        to: booking.email,
        subject: subjectLabel,
        html: `
          <h3>Recordatorio de cita</h3>
          <ul>
            <li><strong>Doctor:</strong> ${booking.doctor_name}</li>
            <li><strong>Fecha:</strong> ${booking.date}</li>
            <li><strong>Hora:</strong> ${booking.time}</li>
          </ul>
        `,
      });

      await pool.query(
        `UPDATE bookings SET ${sentField} = TRUE WHERE id = $1`,
        [booking.id]
      );

    } catch (err) {
      // ✅ Log failure but don't mark as sent — will retry next cron cycle
      console.error(`❌ Reminder failed for booking ${booking.id} after retries:`, err.message);
    }
  }
};

export const startReminderJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ Checking reminders...');
    try {
      await sendReminders(
        'interval \'55 minutes\'',
        'interval \'65 minutes\'',
        'reminder_1h_sent',
        '⏰ Recordatorio: tienes una cita en 1 hora'
      );
      await sendReminders(
        'interval \'23 hours\'',
        'interval \'25 hours\'',
        'reminder_24h_sent',
        '📅 Recordatorio: tienes una cita mañana'
      );
    } catch (error) {
      console.error('💥 Reminder job global error:', error);
    }
  });
};