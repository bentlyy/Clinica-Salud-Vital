import { Response } from 'express';
import * as guestService from './guest.service.js';
import { cleanRut } from '../../shared/rut.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
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
  const rutParam = req.params.rut;
  const rut = Array.isArray(rutParam) ? rutParam[0] : rutParam;
  const bookings = await guestService.getGuestBookingsByRut(cleanRut(rut), req.tenant_id);
  res.json(bookings);
});

export const cancelGuestBooking = asyncHandler(async (req, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const result = await guestService.cancelGuestBooking(Number(req.params.id), req.user!.id, req.user!.role, req.tenant_id);
  res.json(result);
});