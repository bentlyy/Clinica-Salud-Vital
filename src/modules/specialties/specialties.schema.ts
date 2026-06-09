import { z } from 'zod';

export const createSpecialtySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
}).strict();
