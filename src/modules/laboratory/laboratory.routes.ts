import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createLabRequestSchema, labRequestIdSchema } from './laboratory.schema';
import { getLabTests, getLabRequests, getLabRequestById, createLabRequest, updateLabRequestStatus, updateLabRequestItemResult, cancelLabRequest } from './laboratory.controller';

const router = Router();

router.use(authMiddleware);

router.get('/tests', getLabTests);
router.get('/', authorize('admin', 'doctor', 'user'), getLabRequests);
router.get('/:id', authorize('admin', 'doctor', 'user'), validate(labRequestIdSchema, 'params'), getLabRequestById);
router.post('/', authorize('admin', 'doctor'), validate(createLabRequestSchema), createLabRequest);
router.patch('/:id/status', authorize('admin', 'doctor'), validate(labRequestIdSchema, 'params'), updateLabRequestStatus);
router.patch('/items/:item_id/result', authorize('admin', 'doctor'), updateLabRequestItemResult);
router.delete('/:id', authorize('admin', 'doctor'), validate(labRequestIdSchema, 'params'), cancelLabRequest);

export default router;

