import * as guestService from './guest.service.js';
import { cleanRut } from '../../shared/rut.js';

export const createGuestBooking = async (req, res) => {
  try {
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
  } catch (error) {
    const status = error.message.includes('blocked') ? 403 : 400;
    res.status(status).json({ error: error.message });
  }
};

export const getGuestBookingsByRut = async (req, res) => {
  try {
    const bookings = await guestService.getGuestBookingsByRut(cleanRut(req.params.rut));
    res.json(bookings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const cancelGuestBooking = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const result = await guestService.cancelGuestBooking(bookingId, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
