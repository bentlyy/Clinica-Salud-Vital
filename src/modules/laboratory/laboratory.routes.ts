import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createLabRequestSchema, labRequestIdSchema } from './laboratory.schema.js';
import { getLabTests, createLabTest, updateLabTest, deleteLabTest, getLabRequests, getLabRequestById, createLabRequest, updateLabRequestStatus, updateLabRequestItemResult, cancelLabRequest } from './laboratory.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/tests', getLabTests);
router.post('/tests', authorize('admin', 'superadmin'), createLabTest);
router.put('/tests/:id', authorize('admin', 'superadmin'), updateLabTest);
router.delete('/tests/:id', authorize('admin', 'superadmin'), deleteLabTest);
router.get('/', authorize('admin', 'doctor', 'user', 'patient'), getLabRequests);
router.get('/:id', authorize('admin', 'doctor', 'user', 'patient'), validateZod(labRequestIdSchema, 'params'), getLabRequestById);
router.post('/', authorize('admin', 'doctor'), validateZod(createLabRequestSchema), createLabRequest);
router.patch('/:id/status', authorize('admin', 'doctor'), validateZod(labRequestIdSchema, 'params'), updateLabRequestStatus);
router.patch('/items/:item_id/result', authorize('admin', 'doctor'), updateLabRequestItemResult);
router.delete('/:id', authorize('admin', 'doctor'), validateZod(labRequestIdSchema, 'params'), cancelLabRequest);

export default router;

