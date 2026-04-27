import cron from 'node-cron';
import { pool } from '../shared/db.js';
import { sendEmail } from '../shared/email.service.js';

export const startReminderJob = () => {
  // 🔥 cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ Checking reminders...');

    try {
      // =========================================
      // 🔥 RECORDATORIOS 1 HORA
      // =========================================
      const result1h = await pool.query(`
        SELECT 
          b.id,
          b.date,
          b.time,
          u.email,
          d.name AS doctor_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN doctors d ON b.doctor_id = d.id
        WHERE 
          b.reminder_1h_sent = FALSE
          AND (b.date + b.time) BETWEEN 
              NOW() + INTERVAL '55 minutes' 
              AND NOW() + INTERVAL '65 minutes'
      `);

      for (const booking of result1h.rows) {
        try {
          await sendEmail({
            to: booking.email,
            subject: '⏰ Recordatorio: tienes una cita en 1 hora',
            html: `
              <h3>Recordatorio de cita</h3>
              <p>Tienes una cita en aproximadamente 1 hora.</p>

              <ul>
                <li><strong>Doctor:</strong> ${booking.doctor_name}</li>
                <li><strong>Fecha:</strong> ${booking.date}</li>
                <li><strong>Hora:</strong> ${booking.time}</li>
              </ul>
            `
          });

          // 🔥 marcar como enviado
          await pool.query(
            'UPDATE bookings SET reminder_1h_sent = TRUE WHERE id = $1',
            [booking.id]
          );

        } catch (err) {
          console.error('❌ Error sending 1h reminder:', err);
        }
      }

      // =========================================
      // 🔥 RECORDATORIOS 24 HORAS
      // =========================================
      const result24h = await pool.query(`
        SELECT 
          b.id,
          b.date,
          b.time,
          u.email,
          d.name AS doctor_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN doctors d ON b.doctor_id = d.id
        WHERE 
          b.reminder_24h_sent = FALSE
          AND (b.date + b.time) BETWEEN 
              NOW() + INTERVAL '23 hours' 
              AND NOW() + INTERVAL '25 hours'
      `);

      for (const booking of result24h.rows) {
        try {
          await sendEmail({
            to: booking.email,
            subject: '📅 Recordatorio: tienes una cita mañana',
            html: `
              <h3>Recordatorio de cita</h3>
              <p>Tienes una cita programada para mañana.</p>

              <ul>
                <li><strong>Doctor:</strong> ${booking.doctor_name}</li>
                <li><strong>Fecha:</strong> ${booking.date}</li>
                <li><strong>Hora:</strong> ${booking.time}</li>
              </ul>
            `
          });

          // 🔥 marcar como enviado
          await pool.query(
            'UPDATE bookings SET reminder_24h_sent = TRUE WHERE id = $1',
            [booking.id]
          );

        } catch (err) {
          console.error('❌ Error sending 24h reminder:', err);
        }
      }

    } catch (error) {
      console.error('💥 Reminder job global error:', error);
    }
  });
};