import { describe, it, expect } from 'vitest';
import { createInvoiceSchema, updateInvoiceStatusSchema, invoiceIdSchema } from '../../src/modules/billing/billing.schema.js';

describe('createInvoiceSchema', () => {
  it('accepts valid input', () => {
    const result = createInvoiceSchema.safeParse({
      patient_id: 1, concept: 'Consulta', amount: 100, due_date: '2026-06-01',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = createInvoiceSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('updateInvoiceStatusSchema', () => {
  it('accepts valid status', () => {
    const result = updateInvoiceStatusSchema.safeParse({ status: 'paid' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateInvoiceStatusSchema.safeParse({ status: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('invoiceIdSchema', () => {
  it('accepts positive integer', () => {
    const result = invoiceIdSchema.safeParse({ id: 1 });
    expect(result.success).toBe(true);
  });
});
