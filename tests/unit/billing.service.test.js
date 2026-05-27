import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());
const mockRelease = vi.hoisted(() => vi.fn());
const mockConnect = vi.hoisted(() => vi.fn(() => Promise.resolve({ query: mockQuery, release: mockRelease })));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery, connect: mockConnect },
}));

import { createInvoice, getInvoices, getInvoiceById, updateInvoiceStatus, deleteInvoice, getBillingStats } from '../../src/modules/billing/billing.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createInvoice', () => {
  const baseData = { patient_id: 1, concept: 'Consulta', amount: 50000, due_date: '2026-06-01' };

  it('creates invoice without items or tenant', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })                              // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1, invoice_number: 'INV-2026-123456' }] }) // INSERT
      .mockResolvedValueOnce({ rows: [] });                             // COMMIT

    const result = await createInvoice(baseData);
    expect(result.id).toBe(1);
    expect(mockQuery.mock.calls[1][1]).not.toContain('tenant_id');
  });

  it('creates invoice with tenant_id', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })                    // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })           // INSERT
      .mockResolvedValueOnce({ rows: [] });                   // COMMIT

    await createInvoice(baseData, 'tenant-1');
    expect(mockQuery.mock.calls[1][0]).toContain('tenant_id');
    expect(mockQuery.mock.calls[1][1]).toContain('tenant-1');
  });

  it('creates invoice with items', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })                    // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })           // INSERT invoice
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })          // INSERT item
      .mockResolvedValueOnce({ rows: [] });                   // COMMIT

    const data = { ...baseData, items: [{ description: 'Radiografia', quantity: 1, unit_price: 20000 }] };
    const result = await createInvoice(data);
    expect(result.id).toBe(1);
    expect(mockQuery.mock.calls[2][0]).toContain('INSERT INTO invoice_items');
  });

  it('rolls back on error', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })                    // BEGIN
      .mockRejectedValueOnce(new Error('DB error'));          // INSERT fails

    await expect(createInvoice(baseData)).rejects.toThrow('DB error');
    expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
  });
});

describe('getInvoices', () => {
  it('returns all invoices when no filters', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const result = await getInvoices({});
    expect(result).toHaveLength(1);
  });

  it('filters by patient_id, doctor_id, status', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await getInvoices({ patient_id: 1, doctor_id: 2, status: 'pending' });
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('patient_id');
    expect(sql).toContain('doctor_id');
    expect(sql).toContain('status');
  });

  it('filters by date range and tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await getInvoices({ start_date: '2026-01-01', end_date: '2026-12-31' }, 'tenant-1');
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('created_at');
    expect(sql).toContain('tenant_id');
  });
});

describe('getInvoiceById', () => {
  it('returns invoice when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, amount: 100 }] });
    const result = await getInvoiceById(1);
    expect(result.id).toBe(1);
  });

  it('throws when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(getInvoiceById(999)).rejects.toThrow('Invoice not found');
  });

  it('queries with tenant_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    await getInvoiceById(1, 'tenant-1');
    expect(mockQuery.mock.calls[0][0]).toContain('tenant_id');
  });
});

describe('updateInvoiceStatus', () => {
  it('updates status without payment data or tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'paid' }] });
    const result = await updateInvoiceStatus(1, 'paid');
    expect(result.status).toBe('paid');
  });

  it('updates with payment data and tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    await updateInvoiceStatus(1, 'paid', { method: 'transfer' }, 'tenant-1');
    expect(mockQuery.mock.calls[0][0]).toContain('tenant_id');
    expect(mockQuery.mock.calls[0][1][1]).toContain('transfer');
  });

  it('throws when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(updateInvoiceStatus(999, 'paid')).rejects.toThrow('Invoice not found');
  });
});

describe('deleteInvoice', () => {
  it('deletes invoice successfully', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })                    // BEGIN
      .mockResolvedValueOnce({ rows: [] })                    // DELETE items
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })           // DELETE invoice
      .mockResolvedValueOnce({ rows: [] });                   // COMMIT

    const result = await deleteInvoice(1);
    expect(result.message).toContain('deleted');
  });

  it('rolls back when invoice not found', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })                    // BEGIN
      .mockResolvedValueOnce({ rows: [] })                    // DELETE items
      .mockResolvedValueOnce({ rows: [] });                   // DELETE invoice returns empty

    await expect(deleteInvoice(999)).rejects.toThrow('Invoice not found');
    expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
  });
});

describe('getBillingStats', () => {
  it('returns billing stats', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '100000' }] })
      .mockResolvedValueOnce({ rows: [{ total: '200000' }] })
      .mockResolvedValueOnce({ rows: [{ count: '5' }] });

    const stats = await getBillingStats();
    expect(stats.total_outstanding).toBe(100000);
    expect(stats.total_paid).toBe(200000);
    expect(stats.overdue_invoices).toBe(5);
  });

  it('returns zeros when no data', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: null }] })
      .mockResolvedValueOnce({ rows: [{ total: null }] })
      .mockResolvedValueOnce({ rows: [{ count: null }] });

    const stats = await getBillingStats();
    expect(stats.total_outstanding).toBe(0);
    expect(stats.total_paid).toBe(0);
    expect(stats.overdue_invoices).toBe(0);
  });

  it('queries with tenant_id', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await getBillingStats('tenant-1');
    expect(mockQuery.mock.calls[0][0]).toContain('tenant_id');
    expect(mockQuery.mock.calls[1][0]).toContain('tenant_id');
    expect(mockQuery.mock.calls[2][0]).toContain('tenant_id');
  });
});
