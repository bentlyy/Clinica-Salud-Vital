import { Router } from 'express';
import { getMyExceptions, createException, deleteException } from './exception.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createExceptionSchema, exceptionIdSchema } from './exception.schema.js';

const router = Router();

router.get('/me', authMiddleware, authorizeRoles('doctor'), getMyExceptions);
router.post('/', authMiddleware, authorizeRoles('doctor'), validate(createExceptionSchema), createException);
router.delete('/:id', authMiddleware, authorizeRoles('doctor'), validate(exceptionIdSchema, 'params'), deleteException);

export default router;