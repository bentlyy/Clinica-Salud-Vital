import { pool, readPool } from '../../shared/db.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import crypto from 'crypto';

const generateInvoiceNumber = () => {
  const year = new Date().getFullYear();
  const random = crypto.randomInt(100000, 999999).toString();
  return 'INV-' + year + '-' + random;
};

const idempotencyCache = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes

const checkIdempotencyKey = async (key: string, tenantId: string): Promise<boolean> => {
  const cacheKey = `${tenantId}:${key}`;
  const cached = idempotencyCache.get(cacheKey);
  if (cached && Date.now() - cached < IDEMPOTENCY_TTL_MS) {
    return false; // Duplicate within TTL
  }

  const result = await readPool.query(
    `SELECT 1 FROM invoices WHERE payment_reference = $1 AND tenant_id = $2 LIMIT 1`,
    [key, tenantId]
  );
  if (result.rows.length > 0) {
    return false; // Already exists in DB
  }

  idempotencyCache.set(cacheKey, Date.now());

  // Cleanup old entries periodically
  if (idempotencyCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of idempotencyCache) {
      if (now - v > IDEMPOTENCY_TTL_MS) idempotencyCache.delete(k);
    }
  }

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
  if (idempotencyKey && !(await checkIdempotencyKey(idempotencyKey, tenantId))) {
    throw new BadRequestError(E.BILLING_IDEMPOTENCY_DUPLICATE);
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

    // Fail-closed cross-tenant / cross-entity validation
    if (patient_id) {
      const patientRow = await client.query(
        'SELECT id FROM users WHERE id = $1 AND tenant_id = $2 AND role IN (\'user\', \'patient\')',
        [patient_id, tenantId]
      );
      if (patientRow.rows.length === 0) throw new BadRequestError(E.BILLING_PATIENT_NOT_FOUND);
    }
    if (doctor_id) {
      const doctorRow = await client.query(
        'SELECT id FROM doctors WHERE id = $1 AND tenant_id = $2',
        [doctor_id, tenantId]
      );
      if (doctorRow.rows.length === 0) throw new BadRequestError(E.BILLING_DOCTOR_NOT_FOUND);
    }
    if (booking_id) {
      const bookingRow = await client.query(
        'SELECT id, user_id FROM bookings WHERE id = $1 AND tenant_id = $2',
        [booking_id, tenantId]
      );
      if (bookingRow.rows.length === 0 || (patient_id && bookingRow.rows[0].user_id !== patient_id)) {
        throw new BadRequestError(E.BILLING_BOOKING_INVALID);
      }
    }

    const total = Number(data.amount) + Number(data.tax_amount || 0) - Number(data.discount_amount || 0);

    // Verificar que no exista ya una factura para este booking (dentro del lock)
    if (booking_id) {
      const existing = await client.query(
        'SELECT id FROM invoices WHERE booking_id = $1 AND tenant_id = $2',
        [booking_id, tenantId]
      );
      if (existing.rows.length > 0) {
        throw new BadRequestError(E.BILLING_INVOICE_EXISTS);
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

    if (!inserted) throw new BadRequestError(E.BILLING_INVOICE_NUMBER_FAILED);

    if (items && items.length > 0) {
      const itemColumns = ['invoice_id', 'description', 'quantity', 'unit_price', 'tenant_id'];
      const itemValueRows = items.map((_, idx) => {
        const base = idx * itemColumns.length;
        return `(${itemColumns.map((_, colIdx) => '$' + (base + colIdx + 1)).join(', ')})`;
      }).join(', ');
      const itemFlatValues = items.flatMap(item => [
        invoice!.id,
        item.description,
        String(item.quantity),
        String(item.unit_price),
        tenantId,
      ]);
      await client.query(
        `INSERT INTO invoice_items (${itemColumns.join(', ')}) VALUES ${itemValueRows}`,
        itemFlatValues
      );
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
  const query = `SELECT id, invoice_number, patient_id, doctor_id, booking_id, concept, description, amount, currency, tax_amount, discount_amount, total_amount, status, due_date, issued_at, paid_at, payment_method, payment_reference, notes, payment_data, created_at, updated_at, tenant_id FROM invoices ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
  params.push(limit, offset);

  const result = await readPool.query(query, params);
  return result.rows;
};

export const getInvoiceById = async (id: number, tenantId: string = 'default') => {
  const result = await readPool.query('SELECT id, invoice_number, patient_id, doctor_id, booking_id, concept, description, amount, currency, tax_amount, discount_amount, total_amount, status, due_date, issued_at, paid_at, payment_method, payment_reference, notes, payment_data, created_at, updated_at, tenant_id FROM invoices WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
  if (result.rows.length === 0) throw new NotFoundError(E.BILLING_INVOICE_NOT_FOUND);
  return result.rows[0];
};

export const updateInvoiceStatus = async (id: number, status: string, paymentData?: Record<string, unknown>, tenantId: string = 'default') => {
  const result = await pool.query(
    'UPDATE invoices SET status = $1, payment_data = $2, updated_at = NOW() WHERE id = $3 AND tenant_id = $4 RETURNING id, invoice_number, patient_id, doctor_id, booking_id, concept, description, amount, currency, tax_amount, discount_amount, total_amount, status, due_date, issued_at, paid_at, payment_method, payment_reference, notes, payment_data, created_at, updated_at, tenant_id',
    [status, paymentData ? JSON.stringify(paymentData) : null, id, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.BILLING_INVOICE_NOT_FOUND);
  return result.rows[0];
};

export const deleteInvoice = async (id: number, tenantId: string = 'default') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1 AND tenant_id = $2', [id, tenantId]);
    const result = await client.query('DELETE FROM invoices WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, tenantId]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new NotFoundError(E.BILLING_INVOICE_NOT_FOUND);
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
    readPool.query('SELECT SUM(total_amount) AS total FROM invoices WHERE status = $1 AND tenant_id = $2', ['pending', tenantId]),
    readPool.query('SELECT SUM(total_amount) AS total FROM invoices WHERE status = $1 AND tenant_id = $2', ['paid', tenantId]),
    readPool.query('SELECT COUNT(*) AS count FROM invoices WHERE status = $1 AND due_date < CURRENT_DATE AND tenant_id = $2', ['pending', tenantId]),
  ]);

  return {
    total_outstanding: parseFloat(totalOutstanding.rows[0].total) || 0,
    total_paid: parseFloat(totalPaid.rows[0].total) || 0,
    overdue_invoices: parseInt(overdueCount.rows[0].count) || 0,
  };
};
