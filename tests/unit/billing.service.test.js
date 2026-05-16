import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockClient, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockClient: { query: vi.fn(), release: vi.fn() },
  mockConnect: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: mockConnect,
    on: vi.fn(),
  },
}));

import * as billingService from '../../src/modules/billing/billing.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
});

describe('billingService.createInvoice', () => {
  it('creates invoice with items in transaction', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql === 'COMMIT') return Promise.resolve({});
      if (sql.includes('INSERT INTO invoices')) return Promise.resolve({ rows: [{ id: 1, invoice_number: 'INV-2026-00001', total_amount: 150 }] });
      if (sql.includes('INSERT INTO invoice_items')) return Promise.resolve({ rows: [{ id: 1 }] });
      return Promise.resolve({ rows: [] });
    });

    const result = await billingService.createInvoice({
      patient_id: 1, amount: 100, tax_amount: 50, items: [{ description: 'Consulta', amount: 100 }],
    });

    expect(result.id).toBe(1);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('rolls back on error', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('INSERT INTO invoices')) return Promise.reject(new Error('DB error'));
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(billingService.createInvoice({
      patient_id: 1, amount: 100, items: [{ description: 'Consulta', amount: 100 }],
    })).rejects.toThrow('DB error');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

describe('billingService.getInvoices', () => {
  it('returns paginated invoices', async () => {
    const mockInvoices = [{ id: 1, invoice_number: 'INV-2026-00001', total_amount: 150 }];
    mockQuery.mockResolvedValueOnce({ rows: mockInvoices });

    const result = await billingService.getInvoices({ page: 1, limit: 10 });

    expect(result).toHaveLength(1);
    expect(result[0].invoice_number).toBe('INV-2026-00001');
  });

  it('applies status filter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'pending' }] });

    const result = await billingService.getInvoices({ status: 'pending' });

    expect(result).toHaveLength(1);
  });

  it('returns empty array when no invoices', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await billingService.getInvoices({});

    expect(result).toEqual([]);
  });
});

describe('billingService.getInvoiceById', () => {
  it('returns invoice by id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, invoice_number: 'INV-2026-00001' }] });

    const result = await billingService.getInvoiceById(1);

    expect(result.id).toBe(1);
  });

  it('throws if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(billingService.getInvoiceById(999)).rejects.toThrow('Invoice not found');
  });
});

describe('billingService.updateInvoiceStatus', () => {
  it('updates invoice status', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'paid' }] });

    const result = await billingService.updateInvoiceStatus(1, 'paid', { method: 'transfer' });

    expect(result.status).toBe('paid');
  });

  it('throws if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(billingService.updateInvoiceStatus(999, 'paid')).rejects.toThrow('Invoice not found');
  });
});

describe('billingService.deleteInvoice', () => {
  it('deletes invoice and items', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const result = await billingService.deleteInvoice(1);

    expect(result.message).toContain('deleted');
  });

  it('throws if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(billingService.deleteInvoice(999)).rejects.toThrow('Invoice not found');
  });
});

describe('billingService.getBillingStats', () => {
  it('returns aggregate stats', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ sum: '5000' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ sum: '10000' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] });

    const result = await billingService.getBillingStats();

    expect(result).toBeDefined();
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });
});
