import { Router } from 'express';
import { getMyExceptions, createException, deleteException } from './exception.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';
import { validateZod } from '../../middlewares/validate.middleware';
import { createExceptionSchema, exceptionIdSchema } from './exception.schema';

const router = Router();

router.get('/me', authMiddleware, authorizeRoles('doctor'), getMyExceptions);
router.post('/', authMiddleware, authorizeRoles('doctor'), validateZod(createExceptionSchema), createException);
router.delete('/:id', authMiddleware, authorizeRoles('doctor'), validateZod(exceptionIdSchema, 'params'), deleteException);

export default router;

