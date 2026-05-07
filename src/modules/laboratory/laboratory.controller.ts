import * as laboratoryService from './laboratory.service';
import * as doctorService from '../doctor/doctor.service';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware';
import { NotFoundError, BadRequestError } from '../../utils/errors';

const getQuery = (query: Record<string, unknown>, key: string): string | undefined => {
  const val = query[key];
  return val ? String(val) : undefined;
};

const getQueryInt = (query: Record<string, unknown>, key: string, def: number): number => {
  const val = query[key];
  return val ? parseInt(String(val), 10) : def;
};

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

export const getLabRequests = asyncHandler(async (req, res) => {
  const status = getQuery(req.query, 'status');
  const start_date = getQuery(req.query, 'start_date');
  const end_date = getQuery(req.query, 'end_date');
  const limit = getQueryInt(req.query, 'limit', 50);
  const offset = getQueryInt(req.query, 'offset', 0);

  if (req.user.role === 'user') {
    const requests = await laboratoryService.getLabRequests({
      patient_id: req.user.id,
      status,
      limit,
      offset,
    });
    return res.json(requests);
  }

  if (req.user.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user.id);
    if (!doctor) throw new NotFoundError('Doctor profile not found');
    const requests = await laboratoryService.getLabRequests({
      doctor_id: doctor.id,
      status,
      limit,
      offset,
    });
    return res.json(requests);
  }

  const requests = await laboratoryService.getLabRequests({
    status,
    start_date,
    end_date,
    limit,
    offset,
  });
  res.json(requests);
});

export const getLabRequestById = asyncHandler(async (req, res) => {
  const request = await laboratoryService.getLabRequestById(Number(req.params.id));

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
  const request = await laboratoryService.updateLabRequestStatus(Number(req.params.id), status);
  res.json(request);
});

export const updateLabRequestItemResult = asyncHandler(async (req, res) => {
  const { result_value, result_notes } = req.body;
  const item = await laboratoryService.updateLabRequestItemResult(Number(req.params.item_id), result_value, result_notes);
  res.json(item);
});

export const cancelLabRequest = asyncHandler(async (req, res) => {
  const result = await laboratoryService.cancelLabRequest(Number(req.params.id), req.user.id, req.user.role);
  res.json(result);
});