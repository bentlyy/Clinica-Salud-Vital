import * as laboratoryService from './laboratory.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { getQuery, getQueryInt } from '../../shared/query.js';
import { onLabEvent, emitLabEvent, LAB_EVENTS } from './lab-events.service.js';

// === Test Catalog ===
export const getLabTests = asyncHandler(async (req, res) => {
  const category = getQuery(req.query, 'category');
  const areaId = getQueryInt(req.query, 'area_id');
  const active = getQuery(req.query, 'active');
  const limit = getQueryInt(req.query, 'limit', 50);
  const offset = getQueryInt(req.query, 'offset', 0);
  const tenantId = req.user!.role === 'superadmin' ? undefined : req.tenant_id;
  const tests = await laboratoryService.getLabTests({
    category,
    areaId,
    active: active === 'all' ? undefined : active !== 'false',
    limit,
    offset,
  }, tenantId);
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

// === Lab Requests ===
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
    if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);
    const requests = await laboratoryService.getLabRequests({
      doctor_id: doctor.id,
      status,
      limit,
      offset,
    }, req.tenant_id);
    return res.json(requests);
  }

  const tenantId = req.user!.role === 'superadmin' ? undefined : req.tenant_id;
  const requests = await laboratoryService.getLabRequests({
    status,
    start_date,
    end_date,
    limit,
    offset,
  }, tenantId);
  return res.json(requests);
});

export const getLabRequestById = asyncHandler(async (req, res) => {
  const request = await laboratoryService.getLabRequestById(Number(req.params.id), req.tenant_id);

  if ((req.user!.role === 'user' || req.user!.role === 'patient') && request.patient_id !== req.user!.id) {
    throw new BadRequestError(E.LAB_ACCESS_DENIED);
  }

  if (req.user!.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
    if (!doctor || request.doctor_id !== doctor.id) {
      throw new BadRequestError(E.LAB_ACCESS_DENIED);
    }
  }

  res.json(request);
});

export const createLabRequest = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

  const data = { ...req.body, doctor_id: doctor.id };
  const request = await laboratoryService.createLabRequest(data, req.tenant_id);
  emitLabEvent(LAB_EVENTS.NEW_REQUEST, { id: request.id, request_number: request.request_number });
  emitLabEvent(LAB_EVENTS.METRICS_UPDATE, {});
  res.status(201).json(request);
});

export const updateLabRequestStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const request = await laboratoryService.updateLabRequestStatus(Number(req.params.id), status, req.tenant_id);
  emitLabEvent(LAB_EVENTS.STATUS_CHANGE, { id: request.id, status: request.status });
  emitLabEvent(LAB_EVENTS.METRICS_UPDATE, {});
  res.json(request);
});

export const updateLabRequestItemResult = asyncHandler(async (req, res) => {
  const { result_value, result_notes } = req.body;
  const item = await laboratoryService.updateLabRequestItemResult(Number(req.params.item_id), result_value, req.tenant_id, result_notes);
  emitLabEvent(LAB_EVENTS.METRICS_UPDATE, {});
  res.json(item);
});

export const downloadLabOrderPDF = asyncHandler(async (req, res) => {
  const request = await laboratoryService.getLabRequestById(Number(req.params.id), req.tenant_id);

  if ((req.user!.role === 'user' || req.user!.role === 'patient') && request.patient_id !== req.user!.id) {
    throw new BadRequestError(E.LAB_ACCESS_DENIED);
  }
  if (req.user!.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
    if (!doctor || request.doctor_id !== doctor.id) {
      throw new BadRequestError(E.LAB_ACCESS_DENIED);
    }
  }

  const { generateLabOrderPDF } = await import('./lab-order-pdf.service.js');
  const pdfBuffer = await generateLabOrderPDF(request.id, req.tenant_id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=orden-examenes-${request.request_number || request.id}.pdf`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.send(pdfBuffer);
});

export const getLabRequestsForLab = asyncHandler(async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  const requests = await laboratoryService.getAllLabRequestsForLab(status, req.tenant_id);
  res.json(requests);
});

export const updateLabRequestItemStatusCtrl = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const item = await laboratoryService.updateLabRequestItemStatus(Number(req.params.item_id), status, req.tenant_id);
  emitLabEvent(LAB_EVENTS.STATUS_CHANGE, { item_id: Number(req.params.item_id), status });
  emitLabEvent(LAB_EVENTS.METRICS_UPDATE, {});
  res.json(item);
});

export const setLabTypeCtrl = asyncHandler(async (req, res) => {
  const { lab_type } = req.body;
  const request = await laboratoryService.setLabType(Number(req.params.id), lab_type, req.tenant_id);
  res.json(request);
});

export const cancelLabRequest = asyncHandler(async (req, res) => {
  const result = await laboratoryService.cancelLabRequest(Number(req.params.id), req.user!.id, req.user!.role, req.tenant_id);
  emitLabEvent(LAB_EVENTS.STATUS_CHANGE, { id: result.id, status: result.status });
  emitLabEvent(LAB_EVENTS.METRICS_UPDATE, {});
  res.json(result);
});

// === Dashboard ===
export const getDashboardMetricsCtrl = asyncHandler(async (req, res) => {
  const areaId = getQueryInt(req.query, 'area_id');
  const metrics = await laboratoryService.getDashboardMetrics(req.tenant_id, areaId);
  res.json(metrics);
});

export const getAreaDashboardCtrl = asyncHandler(async (req, res) => {
  const areaId = Number(req.params.areaId);
  const dashboard = await laboratoryService.getAreaDashboard(req.tenant_id, areaId);
  res.json(dashboard);
});

export const getAnalyticsDataCtrl = asyncHandler(async (req, res) => {
  const data = await laboratoryService.getAnalyticsData(req.tenant_id);
  res.json(data);
});

// === Samples ===
export const getSamplesCtrl = asyncHandler(async (req, res) => {
  const samples = await laboratoryService.getSamples(req.tenant_id, req.query);
  res.json(samples);
});

export const getSampleByIdCtrl = asyncHandler(async (req, res) => {
  const sample = await laboratoryService.getSampleById(Number(req.params.id), req.tenant_id);
  res.json(sample);
});

export const createSampleCtrl = asyncHandler(async (req, res) => {
  const sample = await laboratoryService.createSample({ ...req.body, received_by: req.user!.id }, req.tenant_id);
  res.status(201).json(sample);
});

export const receiveSampleCtrl = asyncHandler(async (req, res) => {
  const sample = await laboratoryService.receiveSample(Number(req.params.id), req.user!.id, req.tenant_id, req.body);
  res.json(sample);
});

export const verifySampleCtrl = asyncHandler(async (req, res) => {
  const sample = await laboratoryService.verifySample(Number(req.params.id), req.user!.id, req.tenant_id);
  res.json(sample);
});

export const assignSampleCtrl = asyncHandler(async (req, res) => {
  const sample = await laboratoryService.assignSample(Number(req.params.id), req.body, req.tenant_id);
  res.json(sample);
});

export const recordSampleQCCtrl = asyncHandler(async (req, res) => {
  const sample = await laboratoryService.recordSampleQC(Number(req.params.id), req.body, req.tenant_id);
  res.json(sample);
});

export const rejectSampleCtrl = asyncHandler(async (req, res) => {
  const sample = await laboratoryService.rejectSample(Number(req.params.id), req.body.rejection_reason, req.tenant_id);
  res.json(sample);
});

// === Results & Validation ===
export const validateItemByTechCtrl = asyncHandler(async (req, res) => {
  const item = await laboratoryService.validateItemByTech(Number(req.params.item_id), req.user!.id, req.tenant_id);
  res.json(item);
});

export const validateItemByDoctorCtrl = asyncHandler(async (req, res) => {
  const item = await laboratoryService.validateItemByDoctor(Number(req.params.item_id), req.user!.id, req.tenant_id);
  res.json(item);
});

export const signItemCtrl = asyncHandler(async (req, res) => {
  const item = await laboratoryService.signItem(Number(req.params.item_id), req.user!.id, req.tenant_id);
  res.json(item);
});

export const deliverItemCtrl = asyncHandler(async (req, res) => {
  const { method } = req.body;
  const item = await laboratoryService.deliverItem(Number(req.params.item_id), req.tenant_id, method);
  res.json(item);
});

export const getItemHistoryCtrl = asyncHandler(async (req, res) => {
  const history = await laboratoryService.getItemHistory(Number(req.params.item_id), req.tenant_id);
  res.json(history);
});

// === Areas ===
export const getLabAreasCtrl = asyncHandler(async (req, res) => {
  const areas = await laboratoryService.getLabAreas(req.tenant_id);
  res.json(areas);
});

export const createLabAreaCtrl = asyncHandler(async (req, res) => {
  const area = await laboratoryService.createLabArea(req.body, req.tenant_id);
  res.status(201).json(area);
});

// === QC ===
export const getQCRecordsCtrl = asyncHandler(async (req, res) => {
  const records = await laboratoryService.getQCRecords(req.tenant_id, req.query);
  res.json(records);
});

export const createQCRecordCtrl = asyncHandler(async (req, res) => {
  const record = await laboratoryService.createQCRecord({ ...req.body, performed_by: req.user!.id }, req.tenant_id);
  res.status(201).json(record);
});

export const getQCStatisticsCtrl = asyncHandler(async (req, res) => {
  const areaId = getQueryInt(req.query, 'area_id');
  const stats = await laboratoryService.getQCStatistics(req.tenant_id, areaId);
  res.json(stats);
});

// === Equipment ===
export const getEquipmentCtrl = asyncHandler(async (req, res) => {
  const equipment = await laboratoryService.getEquipment(req.tenant_id, req.query);
  res.json(equipment);
});

export const createEquipmentCtrl = asyncHandler(async (req, res) => {
  const item = await laboratoryService.createEquipment(req.body, req.tenant_id);
  res.status(201).json(item);
});

export const updateEquipmentCtrl = asyncHandler(async (req, res) => {
  const item = await laboratoryService.updateEquipment(Number(req.params.id), req.body, req.tenant_id);
  res.json(item);
});

// === Reagents ===
export const getReagentsCtrl = asyncHandler(async (req, res) => {
  const reagents = await laboratoryService.getReagents(req.tenant_id, req.query);
  res.json(reagents);
});

export const createReagentCtrl = asyncHandler(async (req, res) => {
  const reagent = await laboratoryService.createReagent(req.body, req.tenant_id);
  res.status(201).json(reagent);
});

export const updateReagentStockCtrl = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const reagent = await laboratoryService.updateReagentStock(Number(req.params.id), quantity, req.tenant_id);
  res.json(reagent);
});

// === Notifications ===
export const getNotificationsCtrl = asyncHandler(async (req, res) => {
  const tenantId = req.user!.role === 'superadmin' && req.query.tenant_id
    ? String(req.query.tenant_id)
    : req.tenant_id;
  const notifications = await laboratoryService.getNotifications(tenantId, req.query);
  res.json(notifications);
});

export const acknowledgeNotificationCtrl = asyncHandler(async (req, res) => {
  const notification = await laboratoryService.acknowledgeNotification(Number(req.params.id), req.user!.id, req.tenant_id);
  res.json(notification);
});

// === Real-time Events (SSE) ===
export const handleLabEvents = (req: any, res: any) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`event: connected\ndata: {}\n\n`);

  const unsubs: (() => void)[] = [];
  for (const [backendEvent, sseEvent] of Object.entries(LAB_EVENTS)) {
    const listener = (data: unknown) => {
      res.write(`event: ${sseEvent}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const off = onLabEvent(backendEvent, listener);
    unsubs.push(off);
  }

  const heartbeat = setInterval(() => {
    res.write(`:heartbeat\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubs.forEach(fn => fn());
  });
};