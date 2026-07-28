import { Response } from 'express';
import * as guestService from './guest.service.js';
import { cleanRut } from '../../shared/rut.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { BadRequestError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
export const createGuestBooking = asyncHandler(async (req, res: Response) => {
  const { doctor_id, date, time, duration, rut, name, email, phone } = req.body;
  const booking = await guestService.createGuestBooking({
    doctor_id,
    date,
    time,
    duration,
    rut: cleanRut(rut),
    name,
    email,
    phone,
  }, req.tenant_id);
  res.status(201).json(booking);
});

export const getGuestBookingsByRut = asyncHandler(async (req, res: Response) => {
  const rut = req.params.rut as string;
  const bookings = await guestService.getGuestBookingsByRut(cleanRut(rut), req.tenant_id);
  res.json(bookings);
});

export const cancelGuestBooking = asyncHandler(async (req, res: Response) => {
  const bookingId = Number(req.params.id);

  if (req.user) {
    const result = await guestService.cancelGuestBooking(bookingId, req.user.id, req.user.role, req.tenant_id);
    res.json(result);
    return;
  }

  const { rut, confirmation_token } = req.body;
  if (!rut) {
    throw new BadRequestError(E.GUEST_RUT_REQUIRED);
  }

  const result = await guestService.cancelGuestBooking(bookingId, rut, undefined, req.tenant_id, confirmation_token);
  res.json(result);
});