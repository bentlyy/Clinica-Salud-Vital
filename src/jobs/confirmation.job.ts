import cron from 'node-cron';
import bcrypt from 'bcrypt';
import { pool } from '../shared/db.js';
import { logger } from '../utils/logger.js';

const BLOCK_DURATION_HOURS = 168; // 7 days

let _guestDummyHash: string | null = null;
const getGuestDummyHash = async (): Promise<string> => {
  if (!_guestDummyHash) _guestDummyHash = await bcrypt.hash('__no_guest_login__', 12);
  return _guestDummyHash;
};

export const startConfirmationJob = (): void => {
  cron.schedule('0 2 * * *', async () => {
    logger.info('Checking unconfirmed bookings for no-shows...');
    try {
      const result = await pool.query(`
        SELECT b.id, b.date, b.time, b.user_id, b.guest_rut,
               u.email AS user_email, b.guest_email, b.guest_name
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        WHERE b.confirmed = FALSE
          AND b.status = 'pending'
          AND (b.date || ' ' || b.time)::timestamp < NOW() - interval '1 hour'
      `);

      for (const booking of result.rows) {
        try {
          if (booking.user_id) {
            await pool.query(
              `UPDATE users
               SET blocked_until = NOW() + interval '1 hours' * $1,
                   no_show_count = no_show_count + 1
               WHERE id = $2`,
              [BLOCK_DURATION_HOURS, booking.user_id]
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
                 SET blocked_until = NOW() + interval '1 hours' * $1,
                     no_show_count = no_show_count + 1
                  WHERE rut = $2`,
                [BLOCK_DURATION_HOURS, booking.guest_rut]
              );
            } else {
              const dummyHash = await getGuestDummyHash();
              await pool.query(
                `INSERT INTO users (email, password, rut, role, blocked_until, no_show_count)
                 VALUES ($1, $2, $3, 'guest', NOW() + interval '1 hours' * $4, 1)`,
                [booking.guest_email, dummyHash, booking.guest_rut, BLOCK_DURATION_HOURS]
              );
            }
          }

          await pool.query(
            `UPDATE bookings SET status = 'no_show' WHERE id = $1`,
            [booking.id]
          );

          logger.info(`Booking ${booking.id} marked as no-show`);
        } catch (err) {
          logger.error(`Error processing no-show for booking ${booking.id}:`, err);
        }
      }

      logger.info(`Processed ${result.rows.length} no-show(s)`);
    } catch (error) {
      logger.error('Confirmation job global error:', error);
    }
  });
};