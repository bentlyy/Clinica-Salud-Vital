import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware';
import { validateZod } from '../../middlewares/validate.middleware';
import {
  createClinicalRecordSchema,
  updateClinicalRecordSchema,
  prescriptionSchema,
  clinicalRecordIdSchema,
  patientIdSchema,
} from './clinical-record.schema';
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
  searchCie10,
  getCie10ByCode,
  getCie10Categories,
  downloadPrescriptionPDF,
} from './clinical-record.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', authorize('doctor', 'admin'), getClinicalRecords);
router.get('/:id', authorize('doctor', 'admin', 'user'), validateZod(clinicalRecordIdSchema, 'params'), getClinicalRecordById);
router.get('/patient/:patient_id', authorize('doctor', 'admin', 'user'), validateZod(patientIdSchema, 'params'), getClinicalRecordsByPatient);
router.post('/', authorize('doctor'), validateZod(createClinicalRecordSchema), createClinicalRecord);
router.put('/:id', authorize('doctor'), validateZod(updateClinicalRecordSchema), updateClinicalRecord);
router.delete('/:id', authorize('doctor'), validateZod(clinicalRecordIdSchema, 'params'), deleteClinicalRecord);

router.get('/:record_id/prescriptions', authorize('doctor', 'admin'), validateZod(clinicalRecordIdSchema, 'params'), getPrescriptionsByRecord);
router.post('/prescriptions', authorize('doctor'), validateZod(prescriptionSchema), createPrescription);
router.put('/prescriptions/:id', authorize('doctor'), validateZod(prescriptionSchema.partial()), updatePrescription);
router.delete('/prescriptions/:id', authorize('doctor'), deletePrescription);

router.get('/cie10/search', authorize('doctor', 'admin'), searchCie10);
router.get('/cie10/categories', authorize('doctor', 'admin'), getCie10Categories);
router.get('/cie10/:code', authorize('doctor', 'admin'), getCie10ByCode);

router.get('/prescriptions/:id/pdf', authorize('doctor'), downloadPrescriptionPDF);

export default router;

