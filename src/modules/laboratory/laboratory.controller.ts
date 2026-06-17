import * as laboratoryService from './laboratory.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { getQuery, getQueryInt } from '../../shared/query.js';

export const getLabTests = asyncHandler(async (req, res) => {
  const category = getQuery(req.query, 'category');
  const active = getQuery(req.query, 'active');
  const limit = getQueryInt(req.query, 'limit', 50);
  const offset = getQueryInt(req.query, 'offset', 0);
  const tests = await laboratoryService.getLabTests({
    category,
    active: active !== 'false',
    limit,
    offset,
  });
  res.json(tests);
});

export const createLabTest = asyncHandler(async (req, res) => {
  const test = await laboratoryService.createLabTest(req.body, req.tenant_id);
  res.status(201).json(test);
});

export const updateLabTest = asyncHandler(async (req, res) => {
  const test = await laboratoryService.updateLabTest(Number(req.params.id), req.body, req.tenant_id);
  res.json(test);
});

export const deleteLabTest = asyncHandler(async (req, res) => {
  await laboratoryService.deleteLabTest(Number(req.params.id), req.tenant_id);
  res.json({ message: 'Lab test deleted' });
});

export const getLabRequests = asyncHandler(async (req, res) => {
  const status = getQuery(req.query, 'status');
  const start_date = getQuery(req.query, 'start_date');
  const end_date = getQuery(req.query, 'end_date');
  const limit = getQueryInt(req.query, 'limit', 50);
  const offset = getQueryInt(req.query, 'offset', 0);

  if (req.user!.role === 'user' || req.user!.role === 'patient') {
    const requests = await laboratoryService.getLabRequests({
      patient_id: req.user!.id,
      status,
      limit,
      offset,
    }, req.tenant_id);
    return res.json(requests);
  }

  if (req.user!.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
    if (!doctor) throw new NotFoundError('Doctor profile not found');
    const requests = await laboratoryService.getLabRequests({
      doctor_id: doctor.id,
      status,
      limit,
      offset,
    }, req.tenant_id);
    return res.json(requests);
  }

  const requests = await laboratoryService.getLabRequests({
    status,
    start_date,
    end_date,
    limit,
    offset,
  }, req.tenant_id);
  return res.json(requests);
});

export const getLabRequestById = asyncHandler(async (req, res) => {
  const request = await laboratoryService.getLabRequestById(Number(req.params.id), req.tenant_id);

  if (req.user!.role === 'user' && request.patient_id !== req.user!.id) {
    throw new BadRequestError('Access denied');
  }

  if (req.user!.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
    if (!doctor || request.doctor_id !== doctor.id) {
      throw new BadRequestError('Access denied');
    }
  }

  res.json(request);
});

export const createLabRequest = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const data = { ...req.body, doctor_id: doctor.id };
  const request = await laboratoryService.createLabRequest(data, req.tenant_id);
  res.status(201).json(request);
});

export const updateLabRequestStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const request = await laboratoryService.updateLabRequestStatus(Number(req.params.id), status, req.tenant_id);
  res.json(request);
});

export const updateLabRequestItemResult = asyncHandler(async (req, res) => {
  const { result_value, result_notes } = req.body;
  const item = await laboratoryService.updateLabRequestItemResult(Number(req.params.item_id), result_value, req.tenant_id, result_notes);
  res.json(item);
});

export const cancelLabRequest = asyncHandler(async (req, res) => {
  const result = await laboratoryService.cancelLabRequest(Number(req.params.id), req.user!.id, req.user!.role, req.tenant_id);
  res.json(result);
});