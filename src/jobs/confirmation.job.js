import cron from 'node-cron';
import { pool } from '../shared/db.js';

const BLOCK_DURATION_HOURS = 168; // 7 days

export const startConfirmationJob = () => {
  cron.schedule('0 2 * * *', async () => {
    console.log('⏳ Checking unconfirmed bookings for no-shows...');
    try {
      const result = await pool.query(`
        SELECT b.id, b.date, b.time, b.user_id, b.guest_rut,
               u.email AS user_email, b.guest_email, b.guest_name
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        WHERE b.confirmed = FALSE
          AND b.status = 'pending'
          AND (b.date + b.time) < NOW() - interval '1 hour'
      `);

      for (const booking of result.rows) {
        try {
          if (booking.user_id) {
            await pool.query(
              `UPDATE users
               SET blocked_until = NOW() + interval '${BLOCK_DURATION_HOURS} hours',
                   no_show_count = no_show_count + 1
               WHERE id = $1`,
              [booking.user_id]
            );
          }

          if (booking.guest_rut) {
            const existingGuest = await pool.query(
              `SELECT id FROM users WHERE rut = $1`,
              [booking.guest_rut]
            );

            if (existingGuest.rows.length > 0) {
              await pool.query(
                `UPDATE users
                 SET blocked_until = NOW() + interval '${BLOCK_DURATION_HOURS} hours',
                     no_show_count = no_show_count + 1
                 WHERE rut = $1`,
                [booking.guest_rut]
              );
            } else {
              await pool.query(
                `INSERT INTO users (email, password, rut, role, blocked_until, no_show_count)
                 VALUES ($1, $2, $3, 'guest', NOW() + interval '${BLOCK_DURATION_HOURS} hours', 1)`,
                [booking.guest_email, 'N/A_GUEST', booking.guest_rut]
              );
            }
          }

          await pool.query(
            `UPDATE bookings SET status = 'no_show' WHERE id = $1`,
            [booking.id]
          );

          console.log(`🚫 Booking ${booking.id} marked as no-show`);

        } catch (err) {
          console.error(`Error processing no-show for booking ${booking.id}:`, err.message);
        }
      }

      console.log(`✅ Processed ${result.rows.length} no-show(s)`);
    } catch (error) {
      console.error('Confirmation job global error:', error);
    }
  });
};
