import { Router } from 'express';
import { getMyExceptions, createException, deleteException } from './exception.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createExceptionSchema, exceptionIdSchema } from './exception.schema';

const router = Router();

router.get('/me', authMiddleware, authorizeRoles('doctor'), getMyExceptions);
router.post('/', authMiddleware, authorizeRoles('doctor'), validate(createExceptionSchema), createException);
router.delete('/:id', authMiddleware, authorizeRoles('doctor'), validate(exceptionIdSchema, 'params'), deleteException);

export default router;

