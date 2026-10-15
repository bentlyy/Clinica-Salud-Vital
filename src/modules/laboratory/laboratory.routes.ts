import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { requireFeature } from '../../middlewares/feature.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import {
  createLabRequestSchema,
  labRequestIdSchema,
  labItemIdParamSchema,
  labRequestStatusSchema,
  labItemStatusSchema,
  labTypeSchema,
  labItemResultSchema,
  labDeliverSchema,
  labRejectSampleSchema,
  labReagentStockSchema,
  labTestCreateSchema,
  labTestUpdateSchema,
  labAreaCreateSchema,
  labEquipmentCreateSchema,
  labEquipmentUpdateSchema,
  labReagentCreateSchema,
  labSampleCreateSchema,
  labQcCreateSchema,
  labSampleReceiveSchema,
  labSampleAssignSchema,
  labSampleQcSchema,
  labResultsEmailSchema,
} from './laboratory.schema.js';
import {
  getLabTests, createLabTest, updateLabTest, deleteLabTest,
  getLabRequests, getLabRequestById, createLabRequest,
  updateLabRequestStatus, updateLabRequestItemResult, cancelLabRequest,
  downloadLabOrderPDF, getLabRequestsForLab, updateLabRequestItemStatusCtrl, setLabTypeCtrl,
  getDashboardMetricsCtrl, getAreaDashboardCtrl, getAnalyticsDataCtrl,
  getSamplesCtrl, getSampleByIdCtrl, createSampleCtrl,
  receiveSampleCtrl, verifySampleCtrl, assignSampleCtrl,
  recordSampleQCCtrl, rejectSampleCtrl,
  getLabAreasCtrl, createLabAreaCtrl,
  getQCRecordsCtrl, createQCRecordCtrl, getQCStatisticsCtrl,
  getEquipmentCtrl, createEquipmentCtrl, updateEquipmentCtrl,
  getReagentsCtrl, createReagentCtrl, updateReagentStockCtrl,
  getNotificationsCtrl, acknowledgeNotificationCtrl,
  validateItemByTechCtrl, validateItemByDoctorCtrl, signItemCtrl, deliverItemCtrl, getItemHistoryCtrl,
  sendLabResultsEmailCtrl, getLabResultsByTokenCtrl,
  handleLabEvents,
} from './laboratory.controller.js';

const router = Router();

// Endpoint público: limita la fuerza bruta sobre tokens de resultados (PHI).
const sharedResultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator: (req) => req.ip || 'unknown',
});

router.get('/results/shared/:token', sharedResultLimiter, getLabResultsByTokenCtrl);

router.use(authMiddleware);
router.use(requireFeature('laboratory'));

// === Test Catalog ===
router.get('/tests', getLabTests);
router.post('/tests', authorize('admin', 'superadmin'), validateZod(labTestCreateSchema), createLabTest);
router.put('/tests/:id', authorize('admin', 'superadmin'), validateZod(labRequestIdSchema, 'params'), validateZod(labTestUpdateSchema), updateLabTest);
router.delete('/tests/:id', authorize('admin', 'superadmin'), validateZod(labRequestIdSchema, 'params'), deleteLabTest);

// === Lab Technician ===
router.get('/lab/all', authorize('admin', 'superadmin', 'lab_technician'), getLabRequestsForLab);
router.patch('/lab/items/:item_id/status', authorize('admin', 'superadmin', 'lab_technician'), validateZod(labItemIdParamSchema, 'params'), validateZod(labItemStatusSchema), updateLabRequestItemStatusCtrl);
router.patch('/lab/:id/lab-type', authorize('admin', 'superadmin', 'lab_technician'), validateZod(labRequestIdSchema, 'params'), validateZod(labTypeSchema), setLabTypeCtrl);

// === Dashboard ===
router.get('/dashboard', authorize('admin', 'superadmin', 'lab_technician'), getDashboardMetricsCtrl);
router.get('/dashboard/area/:areaId', authorize('admin', 'superadmin', 'lab_technician'), getAreaDashboardCtrl);
router.get('/dashboard/analytics', authorize('admin', 'superadmin', 'lab_technician'), getAnalyticsDataCtrl);

// === Sample Management ===
router.get('/samples', authorize('admin', 'superadmin', 'lab_technician'), getSamplesCtrl);
router.get('/samples/:id', authorize('admin', 'superadmin', 'lab_technician'), getSampleByIdCtrl);
router.post('/samples', authorize('admin', 'superadmin', 'lab_technician'), validateZod(labSampleCreateSchema), createSampleCtrl);
router.patch('/samples/:id/receive', authorize('admin', 'superadmin', 'lab_technician'), validateZod(labRequestIdSchema, 'params'), validateZod(labSampleReceiveSchema), receiveSampleCtrl);
router.patch('/samples/:id/verify', authorize('admin', 'superadmin', 'lab_technician'), validateZod(labRequestIdSchema, 'params'), verifySampleCtrl);
router.patch('/samples/:id/assign', authorize('admin', 'superadmin', 'lab_technician'), validateZod(labRequestIdSchema, 'params'), validateZod(labSampleAssignSchema), assignSampleCtrl);
router.patch('/samples/:id/qc', authorize('admin', 'superadmin', 'lab_technician'), validateZod(labRequestIdSchema, 'params'), validateZod(labSampleQcSchema), recordSampleQCCtrl);
router.patch('/samples/:id/reject', authorize('admin', 'superadmin', 'lab_technician'), validateZod(labRequestIdSchema, 'params'), validateZod(labRejectSampleSchema), rejectSampleCtrl);

// === Items (Results & Validation) ===
router.patch('/items/:item_id/result', authorize('admin', 'superadmin', 'doctor', 'lab_technician'), validateZod(labItemIdParamSchema, 'params'), validateZod(labItemResultSchema), updateLabRequestItemResult);
router.patch('/items/:item_id/validate-tech', authorize('admin', 'superadmin', 'lab_technician'), validateZod(labItemIdParamSchema, 'params'), validateItemByTechCtrl);
router.patch('/items/:item_id/validate-doctor', authorize('admin', 'superadmin', 'doctor'), validateZod(labItemIdParamSchema, 'params'), validateItemByDoctorCtrl);
router.patch('/items/:item_id/sign', authorize('admin', 'superadmin', 'doctor'), validateZod(labItemIdParamSchema, 'params'), signItemCtrl);
router.patch('/items/:item_id/deliver', authorize('admin', 'superadmin', 'lab_technician'), validateZod(labItemIdParamSchema, 'params'), validateZod(labDeliverSchema), deliverItemCtrl);
router.get('/items/:item_id/history', authorize('admin', 'superadmin', 'doctor', 'lab_technician'), validateZod(labItemIdParamSchema, 'params'), getItemHistoryCtrl);

// === Areas ===
router.get('/areas', getLabAreasCtrl);
router.post('/areas', authorize('admin', 'superadmin'), validateZod(labAreaCreateSchema), createLabAreaCtrl);

// === QC ===
router.get('/qc', authorize('admin', 'superadmin', 'lab_technician'), getQCRecordsCtrl);
router.post('/qc', authorize('admin', 'superadmin'), validateZod(labQcCreateSchema), createQCRecordCtrl);
router.get('/qc/statistics', authorize('admin', 'superadmin', 'lab_technician'), getQCStatisticsCtrl);

// === Equipment ===
router.get('/equipment', authorize('admin', 'superadmin', 'lab_technician'), getEquipmentCtrl);
router.post('/equipment', authorize('admin', 'superadmin'), validateZod(labEquipmentCreateSchema), createEquipmentCtrl);
router.put('/equipment/:id', authorize('admin', 'superadmin'), validateZod(labRequestIdSchema, 'params'), validateZod(labEquipmentUpdateSchema), updateEquipmentCtrl);

// === Reagents ===
router.get('/reagents', authorize('admin', 'superadmin', 'lab_technician'), getReagentsCtrl);
router.post('/reagents', authorize('admin', 'superadmin'), validateZod(labReagentCreateSchema), createReagentCtrl);
router.patch('/reagents/:id/stock', authorize('admin', 'superadmin'), validateZod(labRequestIdSchema, 'params'), validateZod(labReagentStockSchema), updateReagentStockCtrl);

// === Notifications ===
router.get('/notifications', authorize('admin', 'superadmin', 'lab_technician', 'doctor'), getNotificationsCtrl);
router.patch('/notifications/:id/ack', authorize('admin', 'superadmin', 'lab_technician', 'doctor'), validateZod(labRequestIdSchema, 'params'), acknowledgeNotificationCtrl);

// === Real-time Events (SSE) ===
router.get('/events', authorize('admin', 'superadmin', 'lab_technician'), handleLabEvents);

// === Lab Requests (parameterized routes must be LAST) ===
router.post('/results/email', authorize('admin', 'superadmin', 'doctor', 'lab_technician'), validateZod(labResultsEmailSchema), sendLabResultsEmailCtrl);
router.get('/', authorize('admin', 'superadmin', 'doctor', 'lab_technician', 'user', 'patient'), getLabRequests);
router.get('/:id', authorize('admin', 'superadmin', 'doctor', 'lab_technician', 'user', 'patient'), validateZod(labRequestIdSchema, 'params'), getLabRequestById);
router.post('/', authorize('admin', 'doctor'), validateZod(createLabRequestSchema), createLabRequest);
router.patch('/:id/status', authorize('admin', 'superadmin', 'doctor', 'lab_technician'), validateZod(labRequestIdSchema, 'params'), validateZod(labRequestStatusSchema), updateLabRequestStatus);
router.delete('/:id', authorize('admin', 'doctor'), validateZod(labRequestIdSchema, 'params'), cancelLabRequest);
router.get('/:id/pdf', authorize('admin', 'superadmin', 'doctor', 'lab_technician', 'user', 'patient'), validateZod(labRequestIdSchema, 'params'), downloadLabOrderPDF);

export default router;
