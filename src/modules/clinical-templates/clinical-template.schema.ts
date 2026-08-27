import { z } from 'zod';

const templateFieldSchema = z.object({
  name: z.string().min(1, 'Field name is required'),
  type: z.enum(['text', 'textarea', 'number', 'select']),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255),
  specialty: z.string().max(255).optional(),
  fields: z.array(templateFieldSchema).min(1, 'At least one field is required'),
}).strict();

export const updateTemplateSchema = createTemplateSchema.partial().strict();

export const templateIdSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();
