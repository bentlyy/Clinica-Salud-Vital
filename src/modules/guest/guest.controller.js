import * as guestService from './guest.service.js';
import { cleanRut } from '../../shared/rut.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';

export const createGuestBooking = asyncHandler(async (req, res) => {
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

export const getGuestBookingsByRut = asyncHandler(async (req, res) => {
  const bookings = await guestService.getGuestBookingsByRut(cleanRut(req.params.rut));
  res.json(bookings);
});

export const cancelGuestBooking = asyncHandler(async (req, res) => {
  const result = await guestService.cancelGuestBooking(req.params.id, req.user.id);
  res.json(result);
});
