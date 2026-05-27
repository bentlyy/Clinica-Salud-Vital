import jwt from 'jsonwebtoken';
import { pool } from '../../shared/db.js';
import { getJWTSecret } from '../../shared/jwt.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

interface ConfirmResult {
  message: string;
  alreadyConfirmed?: boolean;
  confirmed?: boolean;
}

export const confirmBooking = async (token: string, tenantId?: string): Promise<ConfirmResult> => {
  let decoded: { booking_id?: number; user_id?: number; rut?: string };
  try {
    decoded = jwt.verify(token, getJWTSecret()) as { booking_id?: number; user_id?: number; rut?: string };
  } catch {
    throw new BadRequestError('Token inválido');
  }

  const bookingResult = await pool.query(
    `SELECT id, confirmed, guest_rut, user_id, booking_id FROM bookings WHERE confirmation_token = $1${tenantId ? ' AND tenant_id = $2' : ''}`,
    tenantId ? [token, tenantId] : [token]
  );

  if (bookingResult.rows.length === 0) {
    throw new NotFoundError('Reserva no encontrada');
  }

  const booking = bookingResult.rows[0];

  if (decoded.booking_id && Number(decoded.booking_id) !== booking.id) {
    throw new BadRequestError('Token inválido para esta reserva');
  }

  if (booking.confirmed) {
    return { message: 'Esta cita ya fue confirmada', alreadyConfirmed: true };
  }

  await pool.query(
    `UPDATE bookings SET confirmed = TRUE, confirmation_token = NULL WHERE id = $1${tenantId ? ' AND tenant_id = $2' : ''}`,
    tenantId ? [booking.id, tenantId] : [booking.id]
  );

  return { message: 'Cita confirmada correctamente', confirmed: true };
};