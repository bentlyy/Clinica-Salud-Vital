import { pool } from '../../shared/db.js';
import { NotFoundError } from '../../utils/errors.js';

const generateInvoiceNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return 'INV-' + year + '-' + random;
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

export const createInvoice = async (data: InvoiceInput) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const invoiceNumber = generateInvoiceNumber();
    const { patient_id, doctor_id, booking_id, concept, description, amount, tax_amount = 0, discount_amount = 0, due_date, notes, items } = data;

    const total = Number(amount) + Number(tax_amount) - Number(discount_amount);

    const invoiceResult = await client.query(
      'INSERT INTO invoices (invoice_number, patient_id, doctor_id, booking_id, concept, description, amount, tax_amount, discount_amount, total_amount, due_date, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [invoiceNumber, patient_id, doctor_id, booking_id || null, concept, description || null, amount, tax_amount, discount_amount, total, due_date, notes || null]
    );

    const invoice = invoiceResult.rows[0];

    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price) VALUES ($1, $2, $3, $4)',
          [invoice.id, item.description, String(item.quantity), String(item.unit_price)]
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

export const getInvoices = async ({ patient_id, doctor_id, status, start_date, end_date, limit = 20, offset = 0 }: InvoiceFilters = {}) => {
  let query = 'SELECT * FROM invoices WHERE 1=1';
  const params = [];
  let paramCount = 1;

  if (patient_id) { query += ' AND patient_id = $' + paramCount++; params.push(patient_id); }
  if (doctor_id) { query += ' AND doctor_id = $' + paramCount++; params.push(doctor_id); }
  if (status) { query += ' AND status = $' + paramCount++; params.push(status); }
  if (start_date) { query += ' AND created_at >= $' + paramCount++; params.push(start_date); }
  if (end_date) { query += ' AND created_at <= $' + paramCount++; params.push(end_date); }

  query += ' ORDER BY created_at DESC LIMIT $' + paramCount++ + ' OFFSET $' + paramCount++;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
};

export const getInvoiceById = async (id: number) => {
  const result = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
  if (result.rows.length === 0) throw new NotFoundError('Invoice not found');
  return result.rows[0];
};

export const updateInvoiceStatus = async (id: number, status: string, paymentData?: Record<string, unknown>) => {
  const result = await pool.query(
    'UPDATE invoices SET status = $1, payment_data = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [status, paymentData ? JSON.stringify(paymentData) : null, id]
  );
  if (result.rows.length === 0) throw new NotFoundError('Invoice not found');
  return result.rows[0];
};

export const deleteInvoice = async (id: number) => {
  await pool.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
  const result = await pool.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [id]);
  if (result.rows.length === 0) throw new NotFoundError('Invoice not found');
  return { message: 'Invoice deleted' };
};

export const getBillingStats = async () => {
  const [totalOutstanding, totalPaid, overdueCount] = await Promise.all([
    pool.query('SELECT SUM(total_amount) AS total FROM invoices WHERE status = $1', ['pending']),
    pool.query('SELECT SUM(total_amount) AS total FROM invoices WHERE status = $1', ['paid']),
    pool.query('SELECT COUNT(*) AS count FROM invoices WHERE status = $1 AND due_date < CURRENT_DATE', ['pending']),
  ]);

  return {
    total_outstanding: parseFloat(totalOutstanding.rows[0].total) || 0,
    total_paid: parseFloat(totalPaid.rows[0].total) || 0,
    overdue_invoices: parseInt(overdueCount.rows[0].count) || 0,
  };
};
