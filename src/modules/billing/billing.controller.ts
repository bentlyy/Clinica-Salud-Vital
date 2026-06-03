import * as billingService from './billing.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { getQueryInt, getQueryString } from '../../shared/query.js';

export const getInvoices = asyncHandler(async (req, res) => {
  const patient_id = getQueryInt(req.query, 'patient_id', 0);
  const status = getQueryString(req.query, 'status', '');
  const start_date = getQueryString(req.query, 'start_date', '');
  const end_date = getQueryString(req.query, 'end_date', '');
  const limit = getQueryInt(req.query, 'limit', 50);
  const offset = getQueryInt(req.query, 'offset', 0);

  if (req.user!.role === 'user') {
    const invoices = await billingService.getInvoices({ patient_id: req.user!.id, limit, offset }, req.tenant_id);
    return res.json(invoices);
  }

  if (req.user!.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
    if (!doctor) throw new NotFoundError('Doctor profile not found');
    const invoices = await billingService.getInvoices({ doctor_id: doctor.id, limit, offset }, req.tenant_id);
    return res.json(invoices);
  }

  const invoices = await billingService.getInvoices({
    patient_id: patient_id || undefined,
    status: status || undefined,
    start_date: start_date || undefined,
    end_date: end_date || undefined,
    limit,
    offset,
  }, req.tenant_id);
  return res.json(invoices);
});

export const getInvoiceById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id) || id <= 0) throw new BadRequestError('Invalid invoice ID');
  const invoice = await billingService.getInvoiceById(id, req.tenant_id);

  if (req.user!.role === 'user' && invoice.patient_id !== req.user!.id) {
    throw new BadRequestError('Access denied');
  }

  if (req.user!.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
    if (!doctor || invoice.doctor_id !== doctor.id) {
      throw new BadRequestError('Access denied');
    }
  }

  res.json(invoice);
});

export const createInvoice = asyncHandler(async (req, res) => {
  const invoice = await billingService.createInvoice(req.body, req.tenant_id);
  res.status(201).json(invoice);
});

export const updateInvoiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const id = getQueryInt(req.params, 'id', 0);
  const invoice = await billingService.updateInvoiceStatus(id, status, req.body.payment_data, req.tenant_id);
  res.json(invoice);
});

export const deleteInvoice = asyncHandler(async (req, res) => {
  const id = getQueryInt(req.params, 'id', 0);
  const result = await billingService.deleteInvoice(id, req.tenant_id);
  res.json(result);
});

export const getBillingStats = asyncHandler(async (req, res) => {
  const stats = await billingService.getBillingStats(req.tenant_id);
  res.json(stats);
});