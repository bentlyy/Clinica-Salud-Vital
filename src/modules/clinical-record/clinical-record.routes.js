import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createClinicalRecordSchema,
  updateClinicalRecordSchema,
  prescriptionSchema,
  clinicalRecordIdSchema,
  patientIdSchema,
} from './clinical-record.schema.js';
import {
  getClinicalRecords,
  getClinicalRecordById,
  getClinicalRecordsByPatient,
  createClinicalRecord,
  updateClinicalRecord,
  deleteClinicalRecord,
  getPrescriptionsByRecord,
  createPrescription,
  updatePrescription,
  deletePrescription,
} from './clinical-record.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', authorize('doctor', 'admin'), getClinicalRecords);
router.get('/:id', authorize('doctor', 'admin', 'user'), validate(clinicalRecordIdSchema, 'params'), getClinicalRecordById);
router.get('/patient/:patient_id', authorize('doctor', 'admin', 'user'), validate(patientIdSchema, 'params'), getClinicalRecordsByPatient);
router.post('/', authorize('doctor'), validate(createClinicalRecordSchema), createClinicalRecord);
router.put('/:id', authorize('doctor'), validate(updateClinicalRecordSchema), updateClinicalRecord);
router.delete('/:id', authorize('doctor'), validate(clinicalRecordIdSchema, 'params'), deleteClinicalRecord);

router.get('/:record_id/prescriptions', authorize('doctor', 'admin'), validate(clinicalRecordIdSchema, 'params'), getPrescriptionsByRecord);
router.post('/prescriptions', authorize('doctor'), validate(prescriptionSchema), createPrescription);
router.put('/prescriptions/:id', authorize('doctor'), validate(prescriptionSchema.partial()), updatePrescription);
router.delete('/prescriptions/:id', authorize('doctor'), deletePrescription);

export default router;
