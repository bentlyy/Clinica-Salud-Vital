import * as bookingService from './booking.service.js';

export const createBooking = async (req, res) => {
  try {
    const booking = await bookingService.createBooking({
      doctor_id: req.body.doctor_id,
      date: req.body.date,
      time: req.body.time,
      user_id: req.user.id // 🔥 viene del middleware
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await bookingService.getBookingsByUser(userId);

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