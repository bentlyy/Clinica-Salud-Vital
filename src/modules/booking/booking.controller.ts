import * as bookingService from './booking.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError } from '../../utils/errors.js';
import { getQueryInt, getQueryString } from '../../shared/query.js';

export const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking({
    doctor_id: req.body.doctor_id,
    date: req.body.date,
    time: req.body.time,
    user_id: req.user!.id,
    duration: req.body.duration,
  });

  res.status(201).json(booking);
});

export const getMyBookings = asyncHandler(async (req, res) => {
  const page = getQueryInt(req.query, 'page', 1);
  const limit = getQueryInt(req.query, 'limit', 20);
  const bookings = await bookingService.getBookingsByUser(req.user!.id, { page, limit });
  res.json(bookings);
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const result = await bookingService.deleteBooking(Number(req.params.id), req.user!.id);
  res.json(result);
});

export const getAvailableSlots = asyncHandler(async (req, res) => {
  const doctor_id = getQueryInt(req.query, 'doctor_id', 0);
  const date = getQueryString(req.query, 'date', '');
  const slots = await bookingService.getAvailableSlots(doctor_id, date);
  res.json(slots);
});

export const getDoctorBookings = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id);

  if (!doctor) {
    throw new NotFoundError('Doctor profile not found');
  }

  const page = getQueryInt(req.query, 'page', 1);
  const limit = getQueryInt(req.query, 'limit', 50);
  const bookings = await bookingService.getBookingsByDoctor(doctor.id, { page, limit });
  res.json(bookings);
});