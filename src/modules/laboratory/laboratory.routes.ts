import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { requireFeature } from '../../middlewares/feature.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createLabRequestSchema, labRequestIdSchema } from './laboratory.schema.js';
import { getLabTests, createLabTest, updateLabTest, deleteLabTest, getLabRequests, getLabRequestById, createLabRequest, updateLabRequestStatus, updateLabRequestItemResult, cancelLabRequest, downloadLabOrderPDF, getLabRequestsForLab, updateLabRequestItemStatusCtrl, setLabTypeCtrl } from './laboratory.controller.js';

const router = Router();

router.use(authMiddleware);
router.use(requireFeature('laboratory'));

router.get('/tests', getLabTests);
router.post('/tests', authorize('admin', 'superadmin'), createLabTest);
router.put('/tests/:id', authorize('admin', 'superadmin'), updateLabTest);
router.delete('/tests/:id', authorize('admin', 'superadmin'), deleteLabTest);
router.get('/', authorize('admin', 'superadmin', 'doctor', 'lab_technician', 'user', 'patient'), getLabRequests);
router.get('/:id', authorize('admin', 'superadmin', 'doctor', 'lab_technician', 'user', 'patient'), validateZod(labRequestIdSchema, 'params'), getLabRequestById);
router.post('/', authorize('admin', 'doctor'), validateZod(createLabRequestSchema), createLabRequest);
router.patch('/:id/status', authorize('admin', 'superadmin', 'doctor', 'lab_technician'), validateZod(labRequestIdSchema, 'params'), updateLabRequestStatus);
router.patch('/items/:item_id/result', authorize('admin', 'superadmin', 'doctor', 'lab_technician'), updateLabRequestItemResult);
router.delete('/:id', authorize('admin', 'doctor'), validateZod(labRequestIdSchema, 'params'), cancelLabRequest);
router.get('/:id/pdf', authorize('admin', 'superadmin', 'doctor', 'lab_technician', 'user', 'patient'), validateZod(labRequestIdSchema, 'params'), downloadLabOrderPDF);

// Lab technician specific routes
router.get('/lab/all', authorize('admin', 'superadmin', 'lab_technician'), getLabRequestsForLab);
router.patch('/lab/items/:item_id/status', authorize('admin', 'superadmin', 'lab_technician'), updateLabRequestItemStatusCtrl);
router.patch('/lab/:id/lab-type', authorize('admin', 'superadmin', 'lab_technician'), setLabTypeCtrl);

export default router;

