import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { requireFeature } from '../../middlewares/feature.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createLabRequestSchema, labRequestIdSchema } from './laboratory.schema.js';
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

router.get('/results/shared/:token', getLabResultsByTokenCtrl);

router.use(authMiddleware);
router.use(requireFeature('laboratory'));

// === Test Catalog ===
router.get('/tests', getLabTests);
router.post('/tests', authorize('admin', 'superadmin'), createLabTest);
router.put('/tests/:id', authorize('admin', 'superadmin'), updateLabTest);
router.delete('/tests/:id', authorize('admin', 'superadmin'), deleteLabTest);

// === Lab Technician ===
router.get('/lab/all', authorize('admin', 'superadmin', 'lab_technician'), getLabRequestsForLab);
router.patch('/lab/items/:item_id/status', authorize('admin', 'superadmin', 'lab_technician'), updateLabRequestItemStatusCtrl);
router.patch('/lab/:id/lab-type', authorize('admin', 'superadmin', 'lab_technician'), setLabTypeCtrl);

// === Dashboard ===
router.get('/dashboard', authorize('admin', 'superadmin', 'lab_technician'), getDashboardMetricsCtrl);
router.get('/dashboard/area/:areaId', authorize('admin', 'superadmin', 'lab_technician'), getAreaDashboardCtrl);
router.get('/dashboard/analytics', authorize('admin', 'superadmin', 'lab_technician'), getAnalyticsDataCtrl);

// === Sample Management ===
router.get('/samples', authorize('admin', 'superadmin', 'lab_technician'), getSamplesCtrl);
router.get('/samples/:id', authorize('admin', 'superadmin', 'lab_technician'), getSampleByIdCtrl);
router.post('/samples', authorize('admin', 'superadmin', 'lab_technician'), createSampleCtrl);
router.patch('/samples/:id/receive', authorize('admin', 'superadmin', 'lab_technician'), receiveSampleCtrl);
router.patch('/samples/:id/verify', authorize('admin', 'superadmin', 'lab_technician'), verifySampleCtrl);
router.patch('/samples/:id/assign', authorize('admin', 'superadmin', 'lab_technician'), assignSampleCtrl);
router.patch('/samples/:id/qc', authorize('admin', 'superadmin', 'lab_technician'), recordSampleQCCtrl);
router.patch('/samples/:id/reject', authorize('admin', 'superadmin', 'lab_technician'), rejectSampleCtrl);

// === Items (Results & Validation) ===
router.patch('/items/:item_id/result', authorize('admin', 'superadmin', 'doctor', 'lab_technician'), updateLabRequestItemResult);
router.patch('/items/:item_id/validate-tech', authorize('admin', 'superadmin', 'lab_technician'), validateItemByTechCtrl);
router.patch('/items/:item_id/validate-doctor', authorize('admin', 'superadmin', 'doctor'), validateItemByDoctorCtrl);
router.patch('/items/:item_id/sign', authorize('admin', 'superadmin', 'doctor'), signItemCtrl);
router.patch('/items/:item_id/deliver', authorize('admin', 'superadmin', 'lab_technician'), deliverItemCtrl);
router.get('/items/:item_id/history', authorize('admin', 'superadmin', 'doctor', 'lab_technician'), getItemHistoryCtrl);

// === Areas ===
router.get('/areas', getLabAreasCtrl);
router.post('/areas', authorize('admin', 'superadmin'), createLabAreaCtrl);

// === QC ===
router.get('/qc', authorize('admin', 'superadmin', 'lab_technician'), getQCRecordsCtrl);
router.post('/qc', authorize('admin', 'superadmin'), createQCRecordCtrl);
router.get('/qc/statistics', authorize('admin', 'superadmin', 'lab_technician'), getQCStatisticsCtrl);

// === Equipment ===
router.get('/equipment', authorize('admin', 'superadmin', 'lab_technician'), getEquipmentCtrl);
router.post('/equipment', authorize('admin', 'superadmin'), createEquipmentCtrl);
router.put('/equipment/:id', authorize('admin', 'superadmin'), updateEquipmentCtrl);

// === Reagents ===
router.get('/reagents', authorize('admin', 'superadmin', 'lab_technician'), getReagentsCtrl);
router.post('/reagents', authorize('admin', 'superadmin'), createReagentCtrl);
router.patch('/reagents/:id/stock', authorize('admin', 'superadmin'), updateReagentStockCtrl);

// === Notifications ===
router.get('/notifications', authorize('admin', 'superadmin', 'lab_technician', 'doctor'), getNotificationsCtrl);
router.patch('/notifications/:id/ack', authorize('admin', 'superadmin', 'lab_technician', 'doctor'), acknowledgeNotificationCtrl);

// === Real-time Events (SSE) ===
router.get('/events', authorize('admin', 'superadmin', 'lab_technician'), handleLabEvents);

// === Lab Requests (parameterized routes must be LAST) ===
router.post('/results/email', authorize('admin', 'superadmin', 'doctor', 'lab_technician'), sendLabResultsEmailCtrl);
router.get('/', authorize('admin', 'superadmin', 'doctor', 'lab_technician', 'user', 'patient'), getLabRequests);
router.get('/:id', authorize('admin', 'superadmin', 'doctor', 'lab_technician', 'user', 'patient'), validateZod(labRequestIdSchema, 'params'), getLabRequestById);
router.post('/', authorize('admin', 'doctor'), validateZod(createLabRequestSchema), createLabRequest);
router.patch('/:id/status', authorize('admin', 'superadmin', 'doctor', 'lab_technician'), validateZod(labRequestIdSchema, 'params'), updateLabRequestStatus);
router.delete('/:id', authorize('admin', 'doctor'), validateZod(labRequestIdSchema, 'params'), cancelLabRequest);
router.get('/:id/pdf', authorize('admin', 'superadmin', 'doctor', 'lab_technician', 'user', 'patient'), validateZod(labRequestIdSchema, 'params'), downloadLabOrderPDF);

export default router;
