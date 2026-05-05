import { pool } from '../../shared/db.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

const generateInvoiceNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `INV-${year}-${random}`;
};

export const createInvoice = async (data) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const invoiceNumber = generateInvoiceNumber();
    const { patient_id, doctor_id, booking_id, concept, description, amount, tax_amount = 0, discount_amount = 0, due_date, notes, items } = data;

    const total = parseFloat(amount) + parseFloat(tax_amount) - parseFloat(discount_amount);

    const invoiceResult = await client.query(`
      INSERT INTO invoices 
        (invoice_number, patient_id, doctor_id, booking_id, concept, description, amount, tax_amount, discount_amount, total_amount, due_date, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [invoiceNumber, patient_id, doctor_id, booking_id || null, concept, description || null, amount, tax_amount, discount_amount, total, due_date, notes || null]);

    const invoice = invoiceResult.rows[0];

    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(`
          INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5)
        `, [invoice.id, item.description, item.quantity || 1, item.unit_price, (item.quantity || 1) * item.unit_price]);
      }
    }

    await client.query('COMMIT');
    return invoice;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getInvoices = async ({ patient_id, doctor_id, status, start_date, end_date, limit = 50, offset = 0 } = {}) => {
  let query = `
    SELECT i.*, 
           u.email AS patient_email, u.rut AS patient_rut,
           d.name AS doctor_name
    FROM invoices i
    LEFT JOIN users u ON i.patient_id = u.id
    LEFT JOIN doctors d ON i.doctor_id = d.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (patient_id) {
    query += ` AND i.patient_id = $${paramCount++}`;
    params.push(patient_id);
  }

  if (doctor_id) {
    query += ` AND i.doctor_id = $${paramCount++}`;
    params.push(doctor_id);
  }

  if (status) {
    query += ` AND i.status = $${paramCount++}`;
    params.push(status);
  }

  if (start_date) {
    query += ` AND i.issued_at >= $${paramCount++}`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND i.issued_at <= $${paramCount++}`;
    params.push(end_date);
  }

  query += ` ORDER BY i.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
};

export const getInvoiceById = async (id) => {
  const invoiceResult = await pool.query(`
    SELECT i.*, 
           u.email AS patient_email, u.rut AS patient_rut,
           d.name AS doctor_name
    FROM invoices i
    LEFT JOIN users u ON i.patient_id = u.id
    LEFT JOIN doctors d ON i.doctor_id = d.id
    WHERE i.id = $1
  `, [id]);

  if (invoiceResult.rows.length === 0) throw new NotFoundError('Invoice not found');

  const itemsResult = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);

  return { ...invoiceResult.rows[0], items: itemsResult.rows };
};

export const updateInvoiceStatus = async (id, status, payment_data = {}) => {
  const validStatuses = ['pending', 'paid', 'cancelled', 'refunded', 'overdue'];
  if (!validStatuses.includes(status)) {
    throw new BadRequestError('Invalid status');
  }

  const paidAt = status === 'paid' ? 'NOW()' : 'paid_at';

  const result = await pool.query(`
    UPDATE invoices 
    SET status = $1, paid_at = ${status === 'paid' ? 'NOW()' : 'paid_at'}, 
        payment_method = COALESCE($2, payment_method),
        payment_reference = COALESCE($3, payment_reference),
        updated_at = NOW()
    WHERE id = $4
    RETURNING *
  `, [status, payment_data.method || null, payment_data.reference || null, id]);

  if (result.rows.length === 0) throw new NotFoundError('Invoice not found');

  if (status === 'paid' && payment_data.amount) {
    await pool.query(`
      INSERT INTO payments (invoice_id, amount, payment_method, transaction_id, status)
      VALUES ($1, $2, $3, $4, 'completed')
    `, [id, payment_data.amount, payment_data.method || 'manual', payment_data.reference || null]);
  }

  return result.rows[0];
};

export const deleteInvoice = async (id) => {
  const result = await pool.query(
    `DELETE FROM invoices WHERE id = $1 AND status = 'pending' RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) throw new NotFoundError('Invoice not found or cannot be deleted');
  return { message: 'Invoice deleted successfully' };
};

export const getBillingStats = async ({ doctor_id, start_date, end_date } = {}) => {
  let query = `
    SELECT 
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'paid') AS paid,
      COUNT(*) FILTER (WHERE status = 'overdue') AS overdue,
      SUM(total_amount) FILTER (WHERE status = 'paid') AS total_collected,
      SUM(total_amount) FILTER (WHERE status = 'pending') AS total_pending,
      SUM(total_amount) FILTER (WHERE status = 'overdue') AS total_overdue
    FROM invoices
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (doctor_id) {
    query += ` AND doctor_id = $${paramCount++}`;
    params.push(doctor_id);
  }

  if (start_date) {
    query += ` AND issued_at >= $${paramCount++}`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND issued_at <= $${paramCount++}`;
    params.push(end_date);
  }

  const result = await pool.query(query, params);
  return result.rows[0];
};