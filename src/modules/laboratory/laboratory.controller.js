import * as laboratoryService from './laboratory.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export const getLabTests = asyncHandler(async (req, res) => {
  const { category, active, limit, offset } = req.query;
  const tests = await laboratoryService.getLabTests({
    category,
    active: active !== 'false',
    limit: parseInt(limit) || 50,
    offset: parseInt(offset) || 0,
  });
  res.json(tests);
});

export const getLabRequests = asyncHandler(async (req, res) => {
  const { status, start_date, end_date, limit, offset } = req.query;

  if (req.user.role === 'user') {
    const requests = await laboratoryService.getLabRequests({
      patient_id: req.user.id,
      status,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    });
    return res.json(requests);
  }

  if (req.user.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user.id);
    if (!doctor) throw new NotFoundError('Doctor profile not found');
    const requests = await laboratoryService.getLabRequests({
      doctor_id: doctor.id,
      status,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    });
    return res.json(requests);
  }

  const requests = await laboratoryService.getLabRequests({
    status,
    start_date,
    end_date,
    limit: parseInt(limit) || 50,
    offset: parseInt(offset) || 0,
  });
  res.json(requests);
});

export const getLabRequestById = asyncHandler(async (req, res) => {
  const request = await laboratoryService.getLabRequestById(req.params.id);

  if (req.user.role === 'user' && request.patient_id !== req.user.id) {
    throw new BadRequestError('Access denied');
  }

  res.json(request);
});

export const createLabRequest = asyncHandler(async (req, res) => {
  const request = await laboratoryService.createLabRequest(req.body);
  res.status(201).json(request);
});

export const updateLabRequestStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const request = await laboratoryService.updateLabRequestStatus(req.params.id, status);
  res.json(request);
});

export const updateLabRequestItemResult = asyncHandler(async (req, res) => {
  const { result_value, result_notes } = req.body;
  const item = await laboratoryService.updateLabRequestItemResult(req.params.item_id, result_value, result_notes);
  res.json(item);
});

export const cancelLabRequest = asyncHandler(async (req, res) => {
  const result = await laboratoryService.cancelLabRequest(req.params.id, req.user.id, req.user.role);
  res.json(result);
});