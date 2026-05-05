import * as bookingService from './booking.service.js';
import * as doctorService from '../doctor/doctor.service.js';

export const createBooking = async (req, res) => {
  try {
    const booking = await bookingService.createBooking({
      doctor_id: req.body.doctor_id,
      date: req.body.date,
      time: req.body.time,
      user_id: req.user.id,
      duration: req.body.duration,
    });

    res.status(201).json(booking);
  } catch (error) {
    const status = error.message.includes('blocked') ? 403 : 400;
    res.status(status).json({ error: error.message });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const bookings = await bookingService.getBookingsByUser(req.user.id);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const userId = req.user.id;

    const result = await bookingService.deleteBooking(bookingId, userId);

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAvailableSlots = async (req, res) => {
  try {
    const { doctor_id, date } = req.query;

    const slots = await bookingService.getAvailableSlots(doctor_id, date);

    res.json(slots);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getDoctorBookings = async (req, res) => {
  try {
    const doctor = await doctorService.getDoctorByUserId(req.user.id);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    const bookings = await bookingService.getBookingsByDoctor(doctor.id);

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
