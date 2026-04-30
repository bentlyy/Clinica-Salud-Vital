// exception.routes.js
import { Router } from 'express';
import { getMyExceptions, createException, deleteException } from './exception.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';

const router = Router();

router.get('/me',  authMiddleware, authorizeRoles('doctor'), getMyExceptions);
router.post('/',   authMiddleware, authorizeRoles('doctor'), createException);
router.delete('/:id', authMiddleware, authorizeRoles('doctor'), deleteException);

export default router;