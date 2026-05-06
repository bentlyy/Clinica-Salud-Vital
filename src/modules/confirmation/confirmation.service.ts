import jwt from 'jsonwebtoken';
import { pool } from '../../shared/db.js';
import { getJWTSecret } from '../../shared/jwt.js';

interface ConfirmResult {
  message: string;
  alreadyConfirmed?: boolean;
  confirmed?: boolean;
}

export const confirmBooking = async (token: string): Promise<ConfirmResult> => {
  jwt.verify(token, getJWTSecret());

  const bookingResult = await pool.query(
    `SELECT id, confirmed, guest_rut FROM bookings WHERE confirmation_token = $1`,
    [token]
  );

  if (bookingResult.rows.length === 0) {
    throw new Error('Reserva no encontrada');
  }

  const booking = bookingResult.rows[0];

  if (booking.confirmed) {
    return { message: 'Esta cita ya fue confirmada', alreadyConfirmed: true };
  }

  await pool.query(
    `UPDATE bookings SET confirmed = TRUE WHERE id = $1`,
    [booking.id]
  );

  return { message: 'Cita confirmada correctamente', confirmed: true };
};