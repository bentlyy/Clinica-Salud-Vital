import { Response } from 'express';
import * as guestService from './guest.service.js';
import { cleanRut } from '../../shared/rut.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export const createGuestBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
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
  });
  res.status(201).json(booking);
});

export const getGuestBookingsByRut = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rutParam = req.params.rut;
  const rut = Array.isArray(rutParam) ? rutParam[0] : rutParam;
  const bookings = await guestService.getGuestBookingsByRut(cleanRut(rut));
  res.json(bookings);
});

export const cancelGuestBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const result = await guestService.cancelGuestBooking(Number(req.params.id), req.user.id, req.user.role);
  res.json(result);
});