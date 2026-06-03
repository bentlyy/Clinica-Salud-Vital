import { Router } from 'express';
import { getMyExceptions, createException, deleteException } from './exception.controller.js';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createExceptionSchema, exceptionIdSchema } from './exception.schema.js';

const router = Router();

router.get('/me', authMiddleware, authorize('doctor'), getMyExceptions);
router.post('/', authMiddleware, authorize('doctor'), validateZod(createExceptionSchema), createException);
router.delete('/:id', authMiddleware, authorize('doctor'), validateZod(exceptionIdSchema, 'params'), deleteException);

export default router;

