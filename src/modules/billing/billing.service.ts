import { pool } from '../../shared/db.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import crypto from 'crypto';

const generateInvoiceNumber = () => {
  const year = new Date().getFullYear();
  const random = crypto.randomInt(100000, 999999).toString();
  return 'INV-' + year + '-' + random;
};

const checkIdempotencyKey = async (_key: string): Promise<boolean> => {
  return true;
};

export interface InvoiceFilters {
  patient_id?: number;
  doctor_id?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

interface InvoiceInput {
  patient_id: number;
  doctor_id?: number;
  booking_id?: number;
  concept: string;
  description?: string;
  amount: number;
  tax_amount?: number;
  discount_amount?: number;
  due_date: string;
  notes?: string;
  items?: { description: string; quantity: number; unit_price: number }[];
}

export const createInvoice = async (data: InvoiceInput, tenantId: string, idempotencyKey?: string) => {
  if (idempotencyKey && !(await checkIdempotencyKey(idempotencyKey))) {
    throw new BadRequestError('Esta solicitud ya fue procesada (idempotency key duplicada)');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { patient_id, doctor_id, booking_id, concept, description, amount, tax_amount = 0, discount_amount = 0, due_date, notes, items } = data;

    // Advisory lock to prevent race conditions on same booking_id
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1::text || $2))',
      [`create_invoice:${booking_id || 0}`, tenantId]
    );

    const total = Number(data.amount) + Number(data.tax_amount || 0) - Number(data.discount_amount || 0);

    // Verificar que no exista ya una factura para este booking (dentro del lock)
    if (booking_id) {
      const existing = await client.query(
        'SELECT id FROM invoices WHERE booking_id = $1 AND tenant_id = $2',
        [booking_id, tenantId]
      );
      if (existing.rows.length > 0) {
        throw new BadRequestError('Ya existe una factura para esta reserva');
      }
    }

    let invoiceNumber: string = '';
    let inserted = false;
    let retries = 0;
    let invoice: Record<string, unknown> = {};

    while (!inserted && retries < 3) {
      invoiceNumber = generateInvoiceNumber();
      const columns = ['invoice_number', 'patient_id', 'doctor_id', 'booking_id', 'concept', 'description', 'amount', 'tax_amount', 'discount_amount', 'total_amount', 'due_date', 'notes'];
      const valuesList: any[] = [invoiceNumber, patient_id, doctor_id || null, booking_id || null, concept, description || null, amount, tax_amount, discount_amount, total, due_date, notes || null];

      columns.push('tenant_id');
      valuesList.push(tenantId);

      try {
        const result = await client.query(`
          INSERT INTO invoices (${columns.join(', ')})
          VALUES (${valuesList.map((_, i) => '$' + (i + 1)).join(', ')})
          RETURNING *
        `, valuesList);
        inserted = true;
        invoice = result.rows[0];
      } catch (err: unknown) {
        const pgErr = err as { code?: string };
        if (pgErr.code === '23505' && String((pgErr as Record<string, unknown>).constraint).includes('invoice_number') && retries < 3) {
          retries++;
          continue;
        }
        throw err;
      }
    }

    if (!inserted) throw new BadRequestError('Failed to generate unique invoice number after retries');

    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, tenant_id) VALUES ($1, $2, $3, $4, $5)`,
          [invoice!.id, item.description, String(item.quantity), String(item.unit_price), tenantId]
        );
      }
    }

    await client.query('COMMIT');
    return invoice;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getInvoices = async ({ patient_id, doctor_id, status, start_date, end_date, limit = 20, offset = 0 }: InvoiceFilters = {}, tenantId: string) => {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let paramCount = 1;

  if (patient_id) { conditions.push(`patient_id = $${paramCount++}`); params.push(patient_id); }
  if (doctor_id) { conditions.push(`doctor_id = $${paramCount++}`); params.push(doctor_id); }
  if (status) { conditions.push(`status = $${paramCount++}`); params.push(status); }
  if (start_date) { conditions.push(`created_at >= $${paramCount++}`); params.push(start_date); }
  if (end_date) { conditions.push(`created_at <= $${paramCount++}`); params.push(end_date); }
  conditions.push(`tenant_id = $${paramCount++}`); params.push(tenantId);

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const query = `SELECT * FROM invoices ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
};

export const getInvoiceById = async (id: number, tenantId: string = 'default') => {
  const result = await pool.query('SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
  if (result.rows.length === 0) throw new NotFoundError('Invoice not found');
  return result.rows[0];
};

export const updateInvoiceStatus = async (id: number, status: string, paymentData?: Record<string, unknown>, tenantId: string = 'default') => {
  const result = await pool.query(
    'UPDATE invoices SET status = $1, payment_data = $2, updated_at = NOW() WHERE id = $3 AND tenant_id = $4 RETURNING *',
    [status, paymentData ? JSON.stringify(paymentData) : null, id, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Invoice not found');
  return result.rows[0];
};

export const deleteInvoice = async (id: number, tenantId: string = 'default') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1 AND tenant_id = $2', [id, tenantId]);
    const result = await client.query('DELETE FROM invoices WHERE id = $1 AND tenant_id = $2 RETURNING *', [id, tenantId]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Invoice not found');
    }
    await client.query('COMMIT');
    return { message: 'Invoice deleted' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getBillingStats = async (tenantId: string = 'default') => {
  const [totalOutstanding, totalPaid, overdueCount] = await Promise.all([
    pool.query('SELECT SUM(total_amount) AS total FROM invoices WHERE status = $1 AND tenant_id = $2', ['pending', tenantId]),
    pool.query('SELECT SUM(total_amount) AS total FROM invoices WHERE status = $1 AND tenant_id = $2', ['paid', tenantId]),
    pool.query('SELECT COUNT(*) AS count FROM invoices WHERE status = $1 AND due_date < CURRENT_DATE AND tenant_id = $2', ['pending', tenantId]),
  ]);

  return {
    total_outstanding: parseFloat(totalOutstanding.rows[0].total) || 0,
    total_paid: parseFloat(totalPaid.rows[0].total) || 0,
    overdue_invoices: parseInt(overdueCount.rows[0].count) || 0,
  };
};
