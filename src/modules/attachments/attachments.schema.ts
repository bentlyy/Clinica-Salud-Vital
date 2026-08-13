import { z } from 'zod';

export const uploadAttachmentSchema = z.object({
  entity_type: z.enum(['clinical_record', 'prescription', 'lab_result', 'booking', 'medical_history', 'patient']),
  entity_id: z.number().int().positive(),
  file_name: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(255),
  data_base64: z.string().min(1),
}).strict();

export const listAttachmentsSchema = z.object({
  entity_type: z.enum(['clinical_record', 'prescription', 'lab_result', 'booking', 'medical_history', 'patient']),
  entity_id: z.coerce.number().int().positive(),
}).strict();

export const attachmentIdSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();
