import * as bookingService from './booking.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking({
    doctor_id: req.body.doctor_id,
    date: req.body.date,
    time: req.body.time,
    user_id: req.user.id,
    duration: req.body.duration,
  });

  res.status(201).json(booking);
});

export const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.getBookingsByUser(req.user.id);
  res.json(bookings);
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const result = await bookingService.deleteBooking(req.params.id, req.user.id);
  res.json(result);
});

export const getAvailableSlots = asyncHandler(async (req, res) => {
  const slots = await bookingService.getAvailableSlots(req.query.doctor_id, req.query.date);
  res.json(slots);
});

export const getDoctorBookings = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.id);

  if (!doctor) {
    throw new NotFoundError('Doctor profile not found');
  }

  const bookings = await bookingService.getBookingsByDoctor(doctor.id);
  res.json(bookings);
});
