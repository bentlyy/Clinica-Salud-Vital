import { z } from 'zod';

export const createInvoiceSchema = z.object({
  patient_id: z.coerce.number().int().positive('patient_id is required'),
  doctor_id: z.coerce.number().int().positive().optional(),
  booking_id: z.coerce.number().int().positive().optional(),
  concept: z.string().min(1, 'Concept is required').max(255),
  description: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be positive'),
  tax_amount: z.coerce.number().min(0).optional().default(0),
  discount_amount: z.coerce.number().min(0).optional().default(0),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.coerce.number().positive().default(1),
    unit_price: z.coerce.number().positive(),
  })).optional(),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'cancelled', 'refunded', 'overdue']),
  payment_data: z.object({
    amount: z.coerce.number().positive().optional(),
    method: z.string().optional(),
    reference: z.string().optional(),
  }).optional(),
});

export const invoiceIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

