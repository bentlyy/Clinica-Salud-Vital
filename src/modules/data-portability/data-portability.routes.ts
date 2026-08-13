import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { exportPatientDataCtrl, exportMeCtrl } from './data-portability.controller.js';
import { exportPatientParamsSchema } from './data-portability.schema.js';

const router = Router();

router.use(authMiddleware);
router.get('/me', exportMeCtrl);
router.get('/patients/:patientId', authorize('admin', 'doctor', 'superadmin', 'patient'), validateZod(exportPatientParamsSchema, 'params'), exportPatientDataCtrl);

export default router;
