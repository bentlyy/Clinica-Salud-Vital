import { z } from 'zod';

export const createLabRequestSchema = z.object({
  patient_id: z.coerce.number().int().positive('patient_id is required'),
  clinical_record_id: z.coerce.number().int().positive().optional(),
  priority: z.enum(['routine', 'urgent', 'emergency']).optional().default('routine'),
  notes: z.string().optional(),
  test_ids: z.array(z.coerce.number().int().positive()).min(1, 'At least one test is required'),
});

export const updateLabRequestStatusSchema = z.object({
  status: z.enum(['pending', 'collected', 'in_progress', 'completed', 'cancelled']),
});

export const updateLabRequestItemResultSchema = z.object({
  result_value: z.string().min(1, 'Result value is required'),
  result_notes: z.string().optional(),
});

export const labRequestIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});