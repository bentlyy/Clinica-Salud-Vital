import { Request, Response } from 'express';
import * as bookingService from './booking.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { getQueryInt, getQueryString } from '../../shared/query.js';

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.createBooking({
    doctor_id: req.body.doctor_id,
    date: req.body.date,
    time: req.body.time,
    user_id: req.user!.id,
    duration: req.body.duration,
  }, req.tenant_id);

  res.status(201).json(booking);
});

export const getMyBookings = asyncHandler(async (req: Request, res: Response) => {
  const page = getQueryInt(req.query, 'page', 1);
  const limit = getQueryInt(req.query, 'limit', 20);
  const status = getQueryString(req.query, 'status', '');
  const bookings = await bookingService.getBookingsByUser(req.user!.id, { page, limit, status }, req.tenant_id);
  res.json(bookings);
});

export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.cancelBooking(Number(req.params.id), req.user!.id, req.tenant_id, req.body?.reason);
  res.json(result);
});

export const confirmBooking = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.confirmBooking(String(req.params.token), req.tenant_id);
  res.json(result);
});

export const getAvailableSlots = asyncHandler(async (req: Request, res: Response) => {
  const doctor_id = getQueryInt(req.query, 'doctor_id', 0);
  const date = getQueryString(req.query, 'date', '');
  const slots = await bookingService.getAvailableSlots(doctor_id, date, req.tenant_id);
  res.json(slots);
});

export const getDailyDensity = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

  const start = getQueryString(req.query, 'start', '');
  const end = getQueryString(req.query, 'end', '');
  if (!start || !end) {
    throw new BadRequestError(E.BOOKING_MISSING_FIELDS);
  }

  const data = await bookingService.getDailyBookingDensity(doctor.id, start, end, req.tenant_id);
  res.json({ data });
});

export const getAllBookingsAdmin = asyncHandler(async (req: Request, res: Response) => {
  const page = getQueryInt(req.query, 'page', 1);
  const limit = getQueryInt(req.query, 'limit', 100);
  const status = getQueryString(req.query, 'status', '');
  const tenantId = req.user!.role === 'superadmin' ? undefined : req.tenant_id;
  const bookings = await bookingService.getAllBookings({ page, limit, status }, tenantId);
  res.json(bookings);
});

export const getDoctorBookings = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);

  if (!doctor) {
    throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);
  }

  const page = getQueryInt(req.query, 'page', 1);
  const limit = getQueryInt(req.query, 'limit', 50);
  const status = getQueryString(req.query, 'status', '');
  const bookings = await bookingService.getBookingsByDoctor(doctor.id, { page, limit, status }, req.tenant_id);
  res.json(bookings);
});
