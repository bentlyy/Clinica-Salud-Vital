import { z } from 'zod';

export const exportPatientParamsSchema = z.object({
  patientId: z.coerce.number().int().positive(),
}).strict();
