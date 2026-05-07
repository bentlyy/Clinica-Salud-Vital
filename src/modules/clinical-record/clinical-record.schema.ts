import { z } from 'zod';

export const vitalSignsSchema = z.object({
  blood_pressure: z.string().optional(),
  heart_rate: z.coerce.number().optional(),
  temperature: z.coerce.number().optional(),
  respiratory_rate: z.coerce.number().optional(),
  oxygen_saturation: z.coerce.number().optional(),
  weight: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  bmi: z.coerce.number().optional(),
});

export const createClinicalRecordSchema = z.object({
  patient_id: z.coerce.number().int().positive('patient_id is required'),
  booking_id: z.coerce.number().int().positive().optional(),
  chief_complaint: z.string().min(1, 'Motivo de consulta es requerido'),
  anamnesis: z.string().optional(),
  vital_signs: vitalSignsSchema.optional(),
  physical_exam: z.string().optional(),
  diagnosis: z.string().optional(),
  cie10_codes: z.array(z.string()).optional(),
  treatment_plan: z.string().optional(),
  notes: z.string().optional(),
});

export const updateClinicalRecordSchema = createClinicalRecordSchema.partial().extend({
  id: z.coerce.number().int().positive(),
  status: z.enum(['draft', 'completed', 'cancelled']).optional(),
});

export const prescriptionSchema = z.object({
  clinical_record_id: z.coerce.number().int().positive('clinical_record_id is required'),
  medication: z.string().min(1, 'Medicamento es requerido').max(255),
  dosage: z.string().min(1, 'Dosis es requerida').max(100),
  frequency: z.string().min(1, 'Frecuencia es requerida').max(100),
  duration: z.string().max(100).optional(),
  instructions: z.string().optional(),
  route: z.enum(['oral', 'intravenous', 'intramuscular', 'subcutaneous', 'topical', 'rectal', 'sublingual', 'inhaled', 'ophthalmic', 'otic', 'nasal']).default('oral'),
});

export const clinicalRecordIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const patientIdSchema = z.object({
  patient_id: z.coerce.number().int().positive(),
});

export const cie10CatalogSchema = z.object({
  code: z.string().min(1).max(10),
  description: z.string().min(1).max(500),
  category: z.string().max(100).optional(),
});

