import { z } from 'zod';

export const notificationIdSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();
