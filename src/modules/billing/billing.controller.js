import * as billingService from './billing.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export const getInvoices = asyncHandler(async (req, res) => {
  const { patient_id, status, start_date, end_date, limit, offset } = req.query;

  if (req.user.role === 'user') {
    const invoices = await billingService.getInvoices({ patient_id: req.user.id, limit: parseInt(limit) || 50, offset: parseInt(offset) || 0 });
    return res.json(invoices);
  }

  if (req.user.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user.id);
    if (!doctor) throw new NotFoundError('Doctor profile not found');
    const invoices = await billingService.getInvoices({ doctor_id: doctor.id, limit: parseInt(limit) || 50, offset: parseInt(offset) || 0 });
    return res.json(invoices);
  }

  const invoices = await billingService.getInvoices({
    patient_id: patient_id ? parseInt(patient_id) : undefined,
    status,
    start_date,
    end_date,
    limit: parseInt(limit) || 50,
    offset: parseInt(offset) || 0,
  });
  res.json(invoices);
});

export const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await billingService.getInvoiceById(req.params.id);

  if (req.user.role === 'user' && invoice.patient_id !== req.user.id) {
    throw new BadRequestError('Access denied');
  }

  res.json(invoice);
});

export const createInvoice = asyncHandler(async (req, res) => {
  const invoice = await billingService.createInvoice(req.body);
  res.status(201).json(invoice);
});

export const updateInvoiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const invoice = await billingService.updateInvoiceStatus(req.params.id, status, req.body.payment_data);
  res.json(invoice);
});

export const deleteInvoice = asyncHandler(async (req, res) => {
  const result = await billingService.deleteInvoice(req.params.id);
  res.json(result);
});

export const getBillingStats = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  if (req.user.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user.id);
    if (!doctor) throw new NotFoundError('Doctor profile not found');
    const stats = await billingService.getBillingStats({ doctor_id: doctor.id, start_date, end_date });
    return res.json(stats);
  }

  if (req.user.role === 'user') {
    throw new BadRequestError('Access denied');
  }

  const stats = await billingService.getBillingStats({ start_date, end_date });
  res.json(stats);
});